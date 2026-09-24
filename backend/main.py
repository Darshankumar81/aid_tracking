import models
from database import engine
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import modular routers
from routers.audit import router as audit_router
from routers.auth import router as auth_router
from routers.recipients import router as recipients_router
from routers.tracking import router as tracking_router
from routers.transactions import router as transactions_router

# Auto-create missing database tables on backend startup
models.Base.metadata.create_all(bind=engine)

# Initialize the main FastAPI application
app = FastAPI(
    title="Aid Tracking Platform API",
    description="Backend API for managing, tracking, and verifying aid shipments.",
    version="1.0.0",
)

# Setup CORS middleware for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to guarantee CORS headers on internal 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
    )


# WebSocket connection manager
active_connections: list[WebSocket] = []


@app.websocket("/ws/shipments")
async def shipment_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Keep connection alive & listen for client messages
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        active_connections.remove(websocket)


# Mount feature-specific sub-routers into the main app
app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(recipients_router)
app.include_router(tracking_router)
app.include_router(audit_router)


# Root endpoint for basic health checks
@app.get("/", tags=["Health"])
def read_root():
    return {"status": "active", "message": "Aid Tracking API is running."}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)