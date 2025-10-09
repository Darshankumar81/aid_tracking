from fastapi import FastAPI

app = FastAPI(title="Transparent Aid Tracking Platform")

@app.get("/")
def home():
    return {"message": "Hello! Your backend is working"}
