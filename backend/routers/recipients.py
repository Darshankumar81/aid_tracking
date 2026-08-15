from datetime import datetime, timedelta, timezone
import random
from typing import List

from database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
import models
from pydantic import BaseModel
from routers.auth import get_current_user
import schemas
from sqlalchemy.orm import Session, joinedload

router = APIRouter(prefix="/recipients", tags=["Recipients"])


# --- Request Schemas ---
class OTPRequest(BaseModel):
    transaction_id: int


class OTPVerifyRequest(BaseModel):
    transaction_id: int
    otp_code: str


# --- Endpoints ---


@router.get("/shipments", response_model=List[schemas.TransactionResponse])
def get_incoming_shipments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch shipments assigned to the current recipient or all active regional deliveries."""
    query = (
        db.query(models.Transaction)
        .options(
            joinedload(models.Transaction.donor),
            joinedload(models.Transaction.recipient),
        )
        .order_by(models.Transaction.created_at.desc())
    )

    if current_user.role == models.UserRole.recipient:
        # Match recipient ID or show available regional shipments
        shipments = (
            query.filter(
                (models.Transaction.recipient_id == current_user.id)
                | (models.Transaction.recipient_id.is_(None))
            )
            .filter(
                models.Transaction.status.in_(
                    [
                        models.TransactionStatus.in_transit,
                        models.TransactionStatus.delivered,
                        models.TransactionStatus.verified,
                        models.TransactionStatus.pending,
                    ]
                )
            )
            .all()
        )
        return shipments

    return query.all()


@router.post("/generate-otp")
def generate_delivery_otp(
    payload: OTPRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generates a secure 6-digit OTP code for proof-of-delivery."""
    tx = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == payload.transaction_id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Shipment not found")

    otp = f"{random.randint(100000, 999999)}"

    current_user.otp_code = otp
    current_user.otp_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=15
    )

    db.commit()

    return {
        "status": "success",
        "message": f"OTP generated for shipment #{tx.id}",
        "otp_code": otp,  # Exposed for demo and fast testing
        "expires_in_minutes": 15,
    }


@router.post("/verify-delivery", response_model=schemas.TransactionResponse)
def verify_delivery_otp(
    payload: OTPVerifyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Confirms receipt of shipment via OTP matching."""
    tx = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == payload.transaction_id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Validate OTP Code
    if not current_user.otp_code or current_user.otp_code != payload.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please check and retry.",
        )

    # Check Expiration (15-minute window)
    if (
        current_user.otp_expires_at
        and current_user.otp_expires_at.replace(tzinfo=timezone.utc)
        < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please generate a new one.",
        )

    # Mark transaction verified
    tx.status = models.TransactionStatus.verified
    tx.recipient_id = current_user.id
    tx.verified_by = current_user.id
    tx.verified_at = datetime.now(timezone.utc)

    # Clear OTP after successful delivery
    current_user.otp_code = None
    current_user.otp_expires_at = None

    db.commit()
    db.refresh(tx)
    return tx