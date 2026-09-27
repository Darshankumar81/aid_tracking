# routes_shipment.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from auth import get_current_user, get_db
import models
from notifications import notify_recipient_and_donor

router = APIRouter(prefix="/api/shipments", tags=["Shipments"])

class CreateShipmentRequest(BaseModel):
    aid_type: str
    product_name: str
    amount: float
    destination: str
    latitude: float
    longitude: float
    recipient_id: int

@router.post("/")
def create_shipment(
    req: CreateShipmentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in [models.UserRole.donor, models.UserRole.admin]:
        raise HTTPException(status_code=403, detail="Only donors can dispatch aid shipments")

    # Verify recipient exists
    recipient = db.query(models.User).filter(
        models.User.id == req.recipient_id,
        models.User.role == models.UserRole.recipient
    ).first()
    
    if not recipient:
        raise HTTPException(status_code=404, detail="Selected recipient profile not found")

    # 1. Save shipment to DB (Triggers Dashboard Alert)
    shipment = models.Transaction(
        aid_type=req.aid_type,
        product_name=req.product_name,
        amount=req.amount,
        destination=req.destination,
        location=req.destination,
        latitude=req.latitude,
        longitude=req.longitude,
        status=models.TransactionStatus.pending,
        description=f"{req.product_name} dispatched to {recipient.name}",
        donor_id=current_user.id,
        recipient_id=req.recipient_id,
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)

    # 2. Queue SMS & Email notifications in background
    shipment_data = {
        "id": shipment.id,
        "product_name": shipment.product_name,
        "amount": shipment.amount,
        "destination": shipment.destination,
    }
    background_tasks.add_task(
        notify_recipient_and_donor,
        db_session=db,
        recipient_user=recipient,
        donor_user=current_user,
        shipment_details=shipment_data
    )

    return shipment