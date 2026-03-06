from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Transparent Aid Tracking Platform"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "quality"
    DB_HOST: str = "localhost"
    DB_PORT: str = "5432"
    DB_NAME: str = "aid_tracking_db"
    JWT_SECRET: str = "change-this-secret"
    JWT_ALGORITHM: str = "HS256"

settings = Settings()
