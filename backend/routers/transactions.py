import asyncio
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas
from routers.auth import get_current_user
from routers.notifications import notify_recipient_and_donor
from routers.ws import manager

router = APIRouter(prefix="/transactions", tags=["transactions"])

# --- Helper Schemas ---
class StatusUpdateSchema(BaseModel):
    status: models.TransactionStatus

# --- Dependencies ---
def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# --- Endpoints ---

@router.post("", response_model=schemas.TransactionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: schemas.TransactionCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Auto-assign donor_id to current_user if not specified or zero
    donor_id = payload.donor_id or current_user.id

    # Verify donor exists in PostgreSQL
    donor = db.query(models.User).filter(models.User.id == donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor user not found")
        
    # Extract all fields dynamically from schema payload
    tx_dict = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)
    tx_dict["donor_id"] = donor_id

    # Normalize location & destination properties so both are saved
    location_val = tx_dict.get("location") or tx_dict.get("destination")
    if location_val:
        tx_dict["location"] = location_val
        tx_dict["destination"] = location_val

    # Unpack all properties into models.Transaction
    transaction = models.Transaction(**tx_dict)

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # Trigger Notifications if recipient is assigned
    if transaction.recipient_id:
        recipient = db.query(models.User).filter(models.User.id == transaction.recipient_id).first()
        if recipient:
            notify_recipient_and_donor(
                db_session=db,
                recipient_user=recipient,
                donor_user=donor,
                shipment_details={
                    "id": transaction.id,
                    "product_name": transaction.product_name or transaction.aid_type,
                    "destination": transaction.destination or transaction.location,
                    "amount": transaction.amount or transaction.quantity,
                }
            )

    # Real-Time WebSocket Broadcast for newly pledged shipment
    status_val = transaction.status.value if hasattr(transaction.status, "value") else str(transaction.status or "pending")
    await manager.broadcast({
        "event": "NEW_PLEDGE",
        "transaction_id": transaction.id,
        "product_name": transaction.product_name or transaction.aid_type or "Aid Package",
        "destination": transaction.destination or transaction.location or "Regional Target",
        "new_status": status_val.upper()
    })

    return transaction


@router.get("", response_model=List[schemas.TransactionResponse])
@router.get("/", response_model=List[schemas.TransactionResponse])
def list_transactions(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Retrieve filtered transactions based on caller's role with eager-loaded donor/recipient profiles."""
    query = db.query(models.Transaction).options(
        joinedload(models.Transaction.donor),
        joinedload(models.Transaction.recipient)
    )

    if current_user.role == models.UserRole.admin:
        return query.order_by(models.Transaction.created_at.desc()).all()
    elif current_user.role == models.UserRole.donor:
        return query.filter(models.Transaction.donor_id == current_user.id).order_by(models.Transaction.created_at.desc()).all()
    else:
        return query.filter(models.Transaction.recipient_id == current_user.id).order_by(models.Transaction.created_at.desc()).all()


@router.put("/{tx_id}/verify", response_model=schemas.TransactionResponse)
async def verify_transaction(
    tx_id: int, 
    db: Session = Depends(get_db), 
    admin: models.User = Depends(require_admin)
):
    """Admin-only endpoint to mark shipments as verified."""
    tx = db.query(models.Transaction).options(
        joinedload(models.Transaction.donor),
        joinedload(models.Transaction.recipient)
    ).filter(models.Transaction.id == tx_id).first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    tx.status = models.TransactionStatus.verified
    tx.verified_by = admin.id
    tx.verified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tx)

    # Send Notification if recipient is attached
    if tx.recipient and tx.donor:
        notify_recipient_and_donor(
            db_session=db,
            recipient_user=tx.recipient,
            donor_user=tx.donor,
            shipment_details={
                "id": tx.id,
                "product_name": tx.product_name or tx.aid_type,
                "destination": tx.destination or tx.location,
                "amount": tx.amount or tx.quantity,
            }
        )

    # Real-Time WebSocket Broadcast for Admin Verification
    await manager.broadcast({
        "event": "STATUS_UPDATED",
        "transaction_id": tx.id,
        "product_name": tx.product_name or tx.aid_type or "Aid Package",
        "destination": tx.destination or tx.location or "Regional Target",
        "new_status": "VERIFIED"
    })

    return tx


@router.put("/{tx_id}/status", response_model=schemas.TransactionResponse)
async def update_status(
    tx_id: int, 
    payload: StatusUpdateSchema, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update shipment progress (e.g. pending -> in_transit -> delivered)."""
    tx = db.query(models.Transaction).options(
        joinedload(models.Transaction.donor),
        joinedload(models.Transaction.recipient)
    ).filter(models.Transaction.id == tx_id).first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Ownership authorization: Admins, or assigned donor/recipient
    is_owner = (current_user.id == tx.donor_id) or (current_user.id == tx.recipient_id)
    if current_user.role != models.UserRole.admin and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to update this shipment")
        
    tx.status = payload.status
    db.commit()
    db.refresh(tx)

    # Send Notification if recipient is attached
    if tx.recipient and tx.donor:
        notify_recipient_and_donor(
            db_session=db,
            recipient_user=tx.recipient,
            donor_user=tx.donor,
            shipment_details={
                "id": tx.id,
                "product_name": tx.product_name or tx.aid_type,
                "destination": tx.destination or tx.location,
                "amount": tx.amount or tx.quantity,
            }
        )

    # Real-Time WebSocket Broadcast for Shipment Status Changes
    status_str = tx.status.value if hasattr(tx.status, "value") else str(tx.status or "pending")
    await manager.broadcast({
        "event": "STATUS_UPDATED",
        "transaction_id": tx.id,
        "product_name": tx.product_name or tx.aid_type or "Aid Package",
        "destination": tx.destination or tx.location or "Regional Target",
        "new_status": status_str.upper()
    })

    return tx