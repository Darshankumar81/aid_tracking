from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import router as auth_router, get_current_user

app = FastAPI(title="Aid Tracking Platform API")

# Setup CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Auth Endpoints (/register & /login)
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"message": "Aid Tracking API is running."}

# Protected endpoint using the JWT Dependency
@app.get("/transactions")
def get_transactions(current_user: str = Depends(get_current_user)):
    return [
        {
            "id": 1,
            "donor_name": "Global Food Bank (Delhi)",
            "donor_lat": 28.6139,
            "donor_lng": 77.2090,
            "recipient_name": "Community Care (Mumbai)",
            "recipient_lat": 19.0760,
            "recipient_lng": 72.8777,
            "status": "In Transit"
        }
    ]
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)