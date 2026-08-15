"""
Database Seeder for Aid Tracking Platform.
Populates initial users, hubs, and multi-stage humanitarian aid shipments.
"""

from datetime import datetime, timezone, timedelta
import bcrypt
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def hash_password(password: str) -> str:
    # Hash password directly with bcrypt
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def seed_database():
    # Ensure all tables are created
    models.Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        print("🌱 Clearing existing transaction and tracking demo data...")
        db.query(models.Tracking).delete()
        db.query(models.Transaction).delete()
        db.commit()

        # -------------------------------------------------------------
        # 1. Seed or Retrieve Core Platform Users
        # -------------------------------------------------------------
        print("👤 Setting up core system users...")
        
        users_to_seed = [
            {
                "name": "Darshan (Admin HQ)",
                "email": "admin@aidtracker.com",
                "password": hash_password("admin123"),
                "role": models.UserRole.admin
            },
            {
                "name": "Red Cross Volunteer (Donor)",
                "email": "donor@aidtracker.com",
                "password": hash_password("donor123"),
                "role": models.UserRole.donor
            },
            {
                "name": "Field Relief Coordinator",
                "email": "recipient@aidtracker.com",
                "password": hash_password("recipient123"),
                "role": models.UserRole.recipient
            }
        ]

        # Determine the exact column name used in models.User for password
        pwd_col = "hashed_password"
        if hasattr(models.User, "password"):
            pwd_col = "password"
        elif hasattr(models.User, "password_hash"):
            pwd_col = "password_hash"

        user_map = {}
        for u in users_to_seed:
            existing = db.query(models.User).filter(models.User.email == u["email"]).first()
            if not existing:
                user_kwargs = {
                    "name": u["name"],
                    "email": u["email"],
                    "role": u["role"],
                    pwd_col: u["password"]
                }
                new_user = models.User(**user_kwargs)
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                user_map[u["role"].value if hasattr(u["role"], "value") else str(u["role"])] = new_user
            else:
                user_map[existing.role.value if hasattr(existing.role, "value") else str(existing.role)] = existing

        donor_user = user_map.get("donor")
        recipient_user = user_map.get("recipient")

        # -------------------------------------------------------------
        # 2. Seed Realistic Multi-Hub Aid Shipments
        # -------------------------------------------------------------
        print("📦 Seeding multi-hub humanitarian shipments across India...")

        now = datetime.now(timezone.utc)

        sample_shipments = [
            # South Hub (Bangalore) Pipeline
            {
                "aid_type": "Medical Supplies",
                "product_name": "Emergency Trauma Kits",
                "amount": 250.0,
                "destination": "Mangalore",
                "latitude": 12.9141,
                "longitude": 74.8560,
                "status": models.TransactionStatus.in_transit,
                "description": "Emergency Trauma Kits (Mangalore) [Via Bangalore Central Hub]",
                "created_at": now - timedelta(hours=8),
                "verified_at": None,
                "donor_id": donor_user.id if donor_user else 1,
                "recipient_id": recipient_user.id if recipient_user else 1
            },
            {
                "aid_type": "Food & Water",
                "product_name": "Clean Drinking Water Cans",
                "amount": 1000.0,
                "destination": "Mysore",
                "latitude": 12.2958,
                "longitude": 76.6394,
                "status": models.TransactionStatus.pending,
                "description": "Clean Drinking Water Cans (Mysore) [Via Bangalore Central Hub]",
                "created_at": now - timedelta(hours=2),
                "verified_at": None,
                "donor_id": donor_user.id if donor_user else 1,
                "recipient_id": recipient_user.id if recipient_user else 1
            },
            {
                "aid_type": "Shelter & Clothing",
                "product_name": "Thermal Blankets & Tarps",
                "amount": 400.0,
                "destination": "Hubli",
                "latitude": 15.3647,
                "longitude": 75.1240,
                "status": models.TransactionStatus.verified,
                "description": "Thermal Blankets & Tarps (Hubli) [Via Bangalore Central Hub]",
                "created_at": now - timedelta(days=2),
                "verified_at": now - timedelta(hours=14),
                "donor_id": donor_user.id if donor_user else 1,
                "recipient_id": recipient_user.id if recipient_user else 1
            },

            # North Hub (Delhi NCR) Pipeline
            {
                "aid_type": "Medical Supplies",
                "product_name": "Surgical Gloves & Antibiotics",
                "amount": 600.0,
                "destination": "Lucknow",
                "latitude": 26.8467,
                "longitude": 80.9462,
                "status": models.TransactionStatus.in_transit,
                "description": "Surgical Gloves & Antibiotics (Lucknow) [Via Delhi North Hub]",
                "created_at": now - timedelta(hours=6),
                "verified_at": None,
                "donor_id": donor_user.id if donor_user else 1,
                "recipient_id": recipient_user.id if recipient_user else 1
            },
            {
                "aid_type": "Food & Water",
                "product_name": "Fortified Cereal Packs",
                "amount": 850.0,
                "destination": "Jaipur",
                "latitude": 26.9124,
                "longitude": 75.7873,
                "status": models.TransactionStatus.delivered,
                "description": "Fortified Cereal Packs (Jaipur) [Via Delhi North Hub]",
                "created_at": now - timedelta(days=1),
                "verified_at": None,
                "donor_id": donor_user.id if donor_user else 1,
                "recipient_id": recipient_user.id if recipient_user else 1
            },

            # West Hub (Mumbai) Pipeline
            {
                "aid_type": "Shelter & Clothing",
                "product_name": "Waterproof Relief Tents",
                "amount": 150.0,
                "destination": "Pune",
                "latitude": 18.5204,
                "longitude": 73.8567,
                "status": models.TransactionStatus.in_transit,
                "description": "Waterproof Relief Tents (Pune) [Via Mumbai West Hub]",
                "created_at": now - timedelta(hours=4),
                "verified_at": None,
                "donor_id": donor_user.id if donor_user else 1,
                "recipient_id": recipient_user.id if recipient_user else 1
            },
            {
                "aid_type": "Medical Supplies",
                "product_name": "Pediatric Vaccine Vials",
                "amount": 320.0,
                "destination": "Nagpur",
                "latitude": 21.1458,
                "longitude": 79.0882,
                "status": models.TransactionStatus.verified,
                "description": "Pediatric Vaccine Vials (Nagpur) [Via Mumbai West Hub]",
                "created_at": now - timedelta(days=3),
                "verified_at": now - timedelta(days=1, hours=5),
                "donor_id": donor_user.id if donor_user else 1,
                "recipient_id": recipient_user.id if recipient_user else 1
            }
        ]

        for s in sample_shipments:
            tx = models.Transaction(
                aid_type=s["aid_type"],
                product_name=s["product_name"],
                amount=s["amount"],
                destination=s["destination"],
                location=s["destination"],
                latitude=s["latitude"],
                longitude=s["longitude"],
                status=s["status"],
                description=s["description"],
                created_at=s["created_at"],
                verified_at=s["verified_at"],
                donor_id=s["donor_id"],
                recipient_id=s["recipient_id"]
            )
            db.add(tx)

        db.commit()
        print("✅ Database seeding complete! Sample demo accounts and shipments are live.")

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()