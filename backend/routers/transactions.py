# backend/routers/transactions.py
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from database import get_db
import models
import schemas
from routers.auth import get_current_user

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
def create_transaction(
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
        
    transaction = models.Transaction(
        donor_id=donor_id,
        recipient_id=payload.recipient_id,
        aid_type=payload.aid_type,
        product_name=payload.product_name,
        amount=payload.amount,
        status=getattr(payload, "status", models.TransactionStatus.pending) or models.TransactionStatus.pending
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
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
def verify_transaction(
    tx_id: int, 
    db: Session = Depends(get_db), 
    admin: models.User = Depends(require_admin)
):
    """Admin-only endpoint to mark shipments as verified."""
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    tx.status = models.TransactionStatus.verified
    tx.verified_by = admin.id
    tx.verified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tx)
    return tx


@router.put("/{tx_id}/status", response_model=schemas.TransactionResponse)
def update_status(
    tx_id: int, 
    payload: StatusUpdateSchema, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Update shipment progress (e.g. pending -> in_transit -> delivered)."""
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Ownership authorization: Admins, or assigned donor/recipient
    is_owner = (current_user.id == tx.donor_id) or (current_user.id == tx.recipient_id)
    if current_user.role != models.UserRole.admin and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to update this shipment")
        
    tx.status = payload.status
    db.commit()
    db.refresh(tx)
    return tx