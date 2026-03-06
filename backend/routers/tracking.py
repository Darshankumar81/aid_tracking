# backend/routers/tracking.py
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from backend.database import get_db
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user

from backend import models, schemas

from backend.utils.ws_manager import manager
from backend.deps import get_current_user
from datetime import datetime

router = APIRouter(prefix="/tracking", tags=["tracking"])

@router.post("/update", response_model=schemas.TrackingResponse)
async def update_tracking(payload: schemas.TrackingCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Persist a tracking update
    tracking = models.Tracking(
        transaction_id=payload.transaction_id,
        current_lat=payload.current_lat,
        current_lon=payload.current_lon,
    )
    db.add(tracking)
    db.commit()
    db.refresh(tracking)

    # Broadcast update to all websocket clients
    await manager.broadcast({
        "type": "tracking_update",
        "transaction_id": payload.transaction_id,
        "lat": payload.current_lat,
        "lon": payload.current_lon,
        "updated_at": tracking.updated_at.isoformat()
    })
    return tracking

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # keep connection alive; we don't expect incoming messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
