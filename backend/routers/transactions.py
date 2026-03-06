# backend/routers/transactions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db

from backend import models, schemas
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user

from backend.deps import get_current_user, require_admin
from datetime import datetime

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/", response_model=schemas.TransactionResponse)
def create_transaction(payload: schemas.TransactionCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Basic validation: donor must exist
    donor = db.query(models.User).filter(models.User.id == payload.donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    transaction = models.Transaction(
        donor_id=payload.donor_id,
        recipient_id=payload.recipient_id,
        aid_type=payload.aid_type,
        product_name=payload.product_name,
        amount=payload.amount
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.get("/", response_model=list[schemas.TransactionResponse])
def list_transactions(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # For donors/recipients show only related if desired; for admin show all
    if current_user.role.value == "admin":
        return db.query(models.Transaction).all()
    elif current_user.role.value == "donor":
        return db.query(models.Transaction).filter(models.Transaction.donor_id == current_user.id).all()
    else:
        return db.query(models.Transaction).filter(models.Transaction.recipient_id == current_user.id).all()

@router.put("/{tx_id}/verify", response_model=schemas.TransactionResponse)
def verify_transaction(tx_id: int, db: Session = Depends(get_db), admin = Depends(require_admin)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx.status = models.TransactionStatus.verified
    tx.verified_by = admin.id
    tx.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(tx)
    return tx

@router.put("/{tx_id}/status", response_model=schemas.TransactionResponse)
def update_status(tx_id: int, status: models.TransactionStatus, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    # optionally require that only donor/admin can change status
    tx.status = status
    db.commit()
    db.refresh(tx)
    return tx
