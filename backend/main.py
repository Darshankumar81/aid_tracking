# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import modular routers
from routers.auth import router as auth_router
from routers.transactions import router as transactions_router

# Initialize the main FastAPI application
app = FastAPI(
    title="Aid Tracking Platform API",
    description="Backend API for managing, tracking, and verifying aid shipments.",
    version="1.0.0"
)

# Setup CORS middleware for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows React frontend on default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount feature-specific sub-routers into the main app
app.include_router(auth_router)
app.include_router(transactions_router)

# Root endpoint for basic health checks
@app.get("/", tags=["Health"])
def read_root():
    return {"status": "active", "message": "Aid Tracking API is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)