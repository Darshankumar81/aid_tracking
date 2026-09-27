"""Database Seeder script for AidTracker."""

import logging
import bcrypt
from database import SessionLocal, engine
import models

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def seed_database() -> None:
    """Seed database with core system users only."""
    # Ensure tables exist
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Determine available columns dynamically based on your models
        pwd_col = next(
            (col for col in ["password", "password_hash"] if hasattr(models.User, col)),
            "hashed_password",
        )
        has_phone = hasattr(models.User, "phone_number")

        users_data = [
            ("Admin HQ", "admin@example.com", "admin123", getattr(models.UserRole, "admin", "admin"), "+10000000000"),
            ("Donor Org", "donor@example.com", "donor123", getattr(models.UserRole, "donor", "donor"), "+10000000001"),
            ("Field Coordinator", "recipient@example.com", "recipient123", getattr(models.UserRole, "recipient", "recipient"), "+10000000002"),
        ]

        logging.info("👤 Seeding system users...")
        for name, email, pwd, role, phone in users_data:
            # Check if user already exists to prevent duplicates
            user = db.query(models.User).filter(models.User.email == email).first()
            if not user:
                user_kwargs = {
                    "name": name,
                    "email": email,
                    "role": role,
                    pwd_col: hash_password(pwd),
                }
                if has_phone:
                    user_kwargs["phone_number"] = phone

                user = models.User(**user_kwargs)
                db.add(user)

        db.commit()
        logging.info("✅ Core system users verified.")

    except Exception as err:
        db.rollback()
        logging.error(f"❌ Seeding error: {err}")
        raise err
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()