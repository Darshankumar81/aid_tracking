import os
import models
from database import engine
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from websocket_manager import manager as fleet_connection_manager

# Import modular routers
from routers.audit import router as audit_router
from routers.auth import router as auth_router
from routers.notifications import router as notifications_router
from routers.recipients import router as recipients_router
from routers.tracking import router as tracking_router
from routers.transactions import router as transactions_router
from routers.webhooks import router as webhooks_router

# Auto-create missing database tables on backend startup
models.Base.metadata.create_all(bind=engine)

# Initialize the main FastAPI application
app = FastAPI(
    title="Aid Tracking Platform API",
    description="Backend API for managing, tracking, and verifying aid shipments.",
    version="1.0.0",
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://aid-tracking-hoy5.vercel.app",
]

# Setup CORS middleware for local and Vercel React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to guarantee matching CORS headers on internal 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    cors_origin = (
        origin
        if origin in ALLOWED_ORIGINS or origin.endswith(".vercel.app")
        else ALLOWED_ORIGINS[0]
    )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
        },
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
        pass
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)


@app.websocket("/ws/fleet")
async def fleet_websocket_endpoint(websocket: WebSocket):
    await fleet_connection_manager.connect(websocket)
    try:
        # Keep the connection open; fleet updates are sent by transaction handlers.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        fleet_connection_manager.disconnect(websocket)


# Mount feature-specific sub-routers into the main app
app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(recipients_router)
app.include_router(tracking_router)
app.include_router(audit_router)
app.include_router(notifications_router)
app.include_router(webhooks_router)


# Root endpoint for basic health checks
@app.get("/", tags=["Health"])
def read_root():
    return {"status": "active", "message": "Aid Tracking API is running."}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)