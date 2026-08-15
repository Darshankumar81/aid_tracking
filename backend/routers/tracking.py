import math
from datetime import datetime, timezone
from typing import List, Optional

from database import get_db
from fastapi import APIRouter, Depends, HTTPException
import models
from pydantic import BaseModel
import schemas
from sqlalchemy.orm import Session

router = APIRouter(prefix="/tracking", tags=["Live Tracking Simulation"])


class VehiclePosition(BaseModel):
    transaction_id: int
    product_name: str
    status: str
    origin_hub: str
    destination: str
    current_lat: float
    current_lng: float
    progress_percentage: float
    eta_minutes: int
    speed_kmh: int


# Hub reference coordinates
HUBS = {
    "bangalore": {"lat": 12.9716, "lng": 77.5946, "name": "Bangalore Hub"},
    "mumbai": {"lat": 19.0760, "lng": 72.8777, "name": "Mumbai Hub"},
    "delhi": {"lat": 28.6139, "lng": 77.2090, "name": "Delhi Hub"},
}


def get_nearest_hub(lat: float, lng: float):
    min_dist = float("inf")
    chosen = HUBS["bangalore"]
    for hub in HUBS.values():
        dist = math.sqrt((hub["lat"] - lat) ** 2 + (hub["lng"] - lng) ** 2)
        if dist < min_dist:
            min_dist = dist
            chosen = hub
    return chosen


@router.get("/live-fleet", response_model=List[VehiclePosition])
def get_live_fleet_positions(db: Session = Depends(get_db)):
    """Calculates live GPS coordinates of all in-transit delivery trucks."""
    in_transit_txs = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.status.in_(
                [
                    models.TransactionStatus.in_transit,
                    models.TransactionStatus.pending,
                ]
            )
        )
        .all()
    )

    fleet = []
    now = datetime.now(timezone.utc)

    for tx in in_transit_txs:
        dest_lat = tx.latitude or 12.9141
        dest_lng = tx.longitude or 74.8560
        hub = get_nearest_hub(dest_lat, dest_lng)

        if tx.status == models.TransactionStatus.pending:
            # Vehicle staged at the distributing hub
            fleet.append(
                VehiclePosition(
                    transaction_id=tx.id,
                    product_name=tx.product_name
                    or tx.aid_type
                    or "Aid Supplies",
                    status="STAGED",
                    origin_hub=hub["name"],
                    destination=tx.destination or tx.location or "Destination",
                    current_lat=hub["lat"],
                    current_lng=hub["lng"],
                    progress_percentage=0.0,
                    eta_minutes=180,
                    speed_kmh=0,
                )
            )
        else:
            # Shipment is IN_TRANSIT -> calculate simulated moving progress based on time
            # Simulated progress cycle: 60-second loop for demo purposes
            seconds_elapsed = (
                int(now.timestamp()) % 60
            )  # repeats smoothly 0 -> 60s
            progress = min(
                1.0, max(0.0, seconds_elapsed / 60.0)
            )  # 0.0 to 1.0 (100%)

            # Interpolate coordinates between Hub and Destination
            curr_lat = hub["lat"] + (dest_lat - hub["lat"]) * progress
            curr_lng = hub["lng"] + (dest_lng - hub["lng"]) * progress

            fleet.append(
                VehiclePosition(
                    transaction_id=tx.id,
                    product_name=tx.product_name
                    or tx.aid_type
                    or "Aid Supplies",
                    status="IN_TRANSIT",
                    origin_hub=hub["name"],
                    destination=tx.destination or tx.location or "Destination",
                    current_lat=round(curr_lat, 4),
                    current_lng=round(curr_lng, 4),
                    progress_percentage=round(progress * 100, 1),
                    eta_minutes=max(1, int((1.0 - progress) * 45)),
                    speed_kmh=62,
                )
            )

    return fleet