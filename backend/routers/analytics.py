# backend/routers/analytics.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from .. import models, schemas
from backend.deps import require_admin
router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/summary")
def summary(db: Session = Depends(get_db), admin = Depends(require_admin)):
    total_donations = db.query(models.Transaction).filter(models.Transaction.aid_type == "money").count()
    total_products = db.query(models.Transaction).filter(models.Transaction.aid_type == "product").count()
    verified = db.query(models.Transaction).filter(models.Transaction.status == models.TransactionStatus.verified).count()
    pending = db.query(models.Transaction).filter(models.Transaction.status == models.TransactionStatus.pending).count()
    # Region-based aggregation example (simplified)
    region_counts = db.query(models.User.latitude, models.User.longitude).join(models.Transaction, models.Transaction.recipient_id == models.User.id).count()
    return {
        "total_donations": total_donations,
        "total_products": total_products,
        "verified": verified,
        "pending": pending,
        "region_counts_example": region_counts
    }
