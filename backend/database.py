from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Format: postgresql+psycopg://username:password@localhost:5432/database_name
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg://postgres:your_password@localhost:5432/aid_tracking_db"

# PostgreSQL doesn't need connect_args={"check_same_thread": False}
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()