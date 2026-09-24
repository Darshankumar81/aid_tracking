from datetime import datetime, timedelta, timezone
import random
from typing import List

from database import get_db
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
import models
from pydantic import BaseModel
from routers.auth import get_current_user
import schemas
from services.notifications import send_otp_email, send_otp_sms
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generates a secure 6-digit OTP code and dispatches via Email & SMS."""
    tx = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == payload.transaction_id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Shipment not found")

    otp = f"{random.randint(100000, 999999)}"

    # Store OTP and expiration timestamp on recipient user record
    current_user.otp_code = otp
    current_user.otp_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=15
    )

    db.commit()

    # Determine recipient notification details
    recipient_email = current_user.email
    recipient_phone = getattr(current_user, "phone_number", None) or "+919999999999"
    product_title = tx.product_name or "Aid Package"

    # Queue background notification dispatches (Email + SMS)
    background_tasks.add_task(
        send_otp_email,
        to_email=recipient_email,
        otp_code=otp,
        shipment_id=tx.id,
        product_name=product_title,
    )

    background_tasks.add_task(
        send_otp_sms,
        to_phone=recipient_phone,
        otp_code=otp,
        shipment_id=tx.id,
    )

    return {
        "status": "success",
        "message": f"OTP dispatched to email ({recipient_email}) and phone ({recipient_phone})",
        "otp_code": otp,  # Maintained for quick demo testing
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
@router.post("/generate-otp")
def generate_delivery_otp(
    payload: OTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == payload.transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Shipment not found")

    otp = f"{random.randint(100000, 999999)}"

    # Save OTP to the currently logged-in recipient user record
    current_user.otp_code = otp
    current_user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()

    # Dynamic target details derived from the active logged-in user session
    recipient_email = current_user.email
    recipient_phone = current_user.phone_number

    # Send email to logged-in user
    if recipient_email:
        background_tasks.add_task(
            send_otp_email,
            to_email=recipient_email,
            otp_code=otp,
            shipment_id=tx.id,
            product_name=tx.product_name or "Aid Package",
        )

    # Send SMS to logged-in user's phone number
    if recipient_phone:
        background_tasks.add_task(
            send_otp_sms,
            to_phone=recipient_phone,
            otp_code=otp,
            shipment_id=tx.id,
        )

    return {
        "status": "success",
        "message": f"OTP sent to logged-in user ({recipient_email} / {recipient_phone or 'No phone configured'})",
        "otp_code": otp,
        "expires_in_minutes": 15,
    }