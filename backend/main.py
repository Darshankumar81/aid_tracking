# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base

from backend.settings import settings



# import routers to register
from backend.routers import admin, analytics, auth, donors, recipients, suggestions,tracking,transactions,users

app = FastAPI(title=settings.PROJECT_NAME)

# create tables (for dev). For production use Alembic migrations.
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(transactions.router)
app.include_router(tracking.router)
app.include_router(suggestions.router)
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {"message": "API is up"}
