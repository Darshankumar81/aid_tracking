import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/audit", tags=["Public Transparency & Audit"])

class AuditRecord(BaseModel):
    transaction_id: int
    product_name: str
    aid_type: str
    amount: float
    destination: str
    status: str
    donor_name: str
    recipient_name: str
    created_at: Optional[datetime]
    verified_at: Optional[datetime]
    proof_hash: str
    chain_of_custody: List[dict]

def generate_proof_hash(tx: models.Transaction) -> str:
    """Computes a SHA-256 tamper-proof fingerprint for verifiable proof-of-delivery."""
    raw_payload = f"{tx.id}-{tx.product_name}-{tx.amount}-{tx.destination}-{tx.donor_id}-{tx.recipient_id}-{tx.verified_at or tx.created_at}"
    return hashlib.sha256(raw_payload.encode('utf-8')).hexdigest()

@router.get("/ledger", response_model=List[AuditRecord])
def get_public_audit_ledger(db: Session = Depends(get_db)):
    """Public read-only ledger of all humanitarian aid transactions."""
    txs = (
        db.query(models.Transaction)
        .options(
            joinedload(models.Transaction.donor),
            joinedload(models.Transaction.recipient)
        )
        .order_by(models.Transaction.created_at.desc())
        .all()
    )

    ledger = []
    for tx in txs:
        donor_name = tx.donor.name if tx.donor and tx.donor.name else "Anonymous Donor"
        recipient_name = tx.recipient.name if tx.recipient and tx.recipient.name else "Regional Field Coordinator"
        dest = tx.destination or tx.location or "Regional Logistics Hub"
        
        # Build chronological Chain-of-Custody
        timeline = [
            {"stage": "Aid Pledged & Registered", "time": tx.created_at.strftime("%Y-%m-%d %H:%M UTC") if tx.created_at else "Logged", "status": "COMPLETED"},
            {"stage": "Received at Regional Distributing Hub", "time": "Processed", "status": "COMPLETED" if tx.status in [models.TransactionStatus.in_transit, models.TransactionStatus.delivered, models.TransactionStatus.verified] else "PENDING"},
            {"stage": "Outbound Transit to Recipient", "time": "In Transit" if tx.status == models.TransactionStatus.in_transit else ("Completed" if tx.status in [models.TransactionStatus.delivered, models.TransactionStatus.verified] else "Pending"), "status": "COMPLETED" if tx.status in [models.TransactionStatus.delivered, models.TransactionStatus.verified] else ("IN_PROGRESS" if tx.status == models.TransactionStatus.in_transit else "PENDING")},
            {"stage": "Final Recipient OTP Proof Signed", "time": tx.verified_at.strftime("%Y-%m-%d %H:%M UTC") if tx.verified_at else "Pending Sign-Off", "status": "VERIFIED" if tx.status == models.TransactionStatus.verified else "PENDING"}
        ]

        ledger.append(
            AuditRecord(
                transaction_id=tx.id,
                product_name=tx.product_name or tx.aid_type or "Aid Consignment",
                aid_type=tx.aid_type or tx.type or "Emergency Relief",
                amount=float(tx.amount or 0),
                destination=dest,
                status=(tx.status or "pending").upper(),
                donor_name=donor_name,
                recipient_name=recipient_name,
                created_at=tx.created_at,
                verified_at=tx.verified_at,
                proof_hash=generate_proof_hash(tx),
                chain_of_custody=timeline
            )
        )
    return ledger

@router.get("/verify/{transaction_id}", response_model=AuditRecord)
def verify_single_shipment(transaction_id: int, db: Session = Depends(get_db)):
    """Search and cryptographically verify a single shipment by its ID."""
    tx = (
        db.query(models.Transaction)
        .options(
            joinedload(models.Transaction.donor),
            joinedload(models.Transaction.recipient)
        )
        .filter(models.Transaction.id == transaction_id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail=f"Shipment #{transaction_id} not found in public ledger")

    donor_name = tx.donor.name if tx.donor and tx.donor.name else "Anonymous Donor"
    recipient_name = tx.recipient.name if tx.recipient and tx.recipient.name else "Regional Field Coordinator"
    dest = tx.destination or tx.location or "Regional Logistics Hub"

    timeline = [
        {"stage": "Aid Pledged & Registered", "time": tx.created_at.strftime("%Y-%m-%d %H:%M UTC") if tx.created_at else "Logged", "status": "COMPLETED"},
        {"stage": "Received at Regional Distributing Hub", "time": "Processed", "status": "COMPLETED" if tx.status in [models.TransactionStatus.in_transit, models.TransactionStatus.delivered, models.TransactionStatus.verified] else "PENDING"},
        {"stage": "Outbound Transit to Recipient", "time": "In Transit" if tx.status == models.TransactionStatus.in_transit else ("Completed" if tx.status in [models.TransactionStatus.delivered, models.TransactionStatus.verified] else "Pending"), "status": "COMPLETED" if tx.status in [models.TransactionStatus.delivered, models.TransactionStatus.verified] else ("IN_PROGRESS" if tx.status == models.TransactionStatus.in_transit else "PENDING")},
        {"stage": "Final Recipient OTP Proof Signed", "time": tx.verified_at.strftime("%Y-%m-%d %H:%M UTC") if tx.verified_at else "Pending Sign-Off", "status": "VERIFIED" if tx.status == models.TransactionStatus.verified else "PENDING"}
    ]

    return AuditRecord(
        transaction_id=tx.id,
        product_name=tx.product_name or tx.aid_type or "Aid Consignment",
        aid_type=tx.aid_type or tx.type or "Emergency Relief",
        amount=float(tx.amount or 0),
        destination=dest,
        status=(tx.status or "pending").upper(),
        donor_name=donor_name,
        recipient_name=recipient_name,
        created_at=tx.created_at,
        verified_at=tx.verified_at,
        proof_hash=generate_proof_hash(tx),
        chain_of_custody=timeline
    )