from datetime import datetime
from typing import List, Optional

from models import TransactionStatus, UserRole
from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from pydantic import BaseModel



# -------------------------------------------------------------
# AUTH & TOKEN SCHEMAS
# -------------------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional["UserResponse"] = None


class TokenPayload(BaseModel):
    sub: Optional[int] = None
    role: Optional[UserRole] = None


# -------------------------------------------------------------
# USER SCHEMAS
# -------------------------------------------------------------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[UserRole] = UserRole.donor
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    phone_number: Optional[str] = None
    role: UserRole
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# TRANSACTION SCHEMAS
# -------------------------------------------------------------
class TransactionCreate(BaseModel):
    donor_id: Optional[int] = None  # Auto-populated from JWT token if omitted
    recipient_id: Optional[int] = None
    aid_type: str
    type: Optional[str] = None
    product_name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    quantity: Optional[int] = None
    status: Optional[TransactionStatus] = TransactionStatus.pending

    # --- Location & Geolocation Fields ---
    location: Optional[str] = None
    destination: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TransactionResponse(BaseModel):
    id: int
    donor_id: int
    recipient_id: Optional[int] = None
    aid_type: str
    type: Optional[str] = None
    product_name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    quantity: Optional[int] = None
    status: TransactionStatus

    # --- Location & Geolocation Fields ---
    location: Optional[str] = None
    destination: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    created_at: datetime

    # Optional nested objects for rich frontend views
    donor: Optional[UserResponse] = None
    recipient: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# TRACKING SCHEMAS
# -------------------------------------------------------------
class TrackingCreate(BaseModel):
    transaction_id: int
    current_lat: float
    current_lon: float


class TrackingResponse(BaseModel):
    id: int
    transaction_id: int
    current_lat: float
    current_lon: float
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# SUGGESTION SCHEMAS
# -------------------------------------------------------------
class SuggestionCreate(BaseModel):
    user_id: Optional[int] = None
    message: str


class SuggestionResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Resolve circular type reference for Token schema
Token.model_rebuild()

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True