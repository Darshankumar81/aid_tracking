# backend/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from backend.models import UserRole, TransactionStatus

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None
    role: Optional[UserRole] = None

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[UserRole] = UserRole.donor
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: Optional[str]
    role: UserRole
    latitude: Optional[float]
    longitude: Optional[float]
    verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TransactionCreate(BaseModel):
    donor_id: int
    recipient_id: Optional[int] = None
    aid_type: str
    product_name: Optional[str] = None
    amount: Optional[float] = None

class TransactionResponse(BaseModel):
    id: int
    donor_id: int
    recipient_id: Optional[int]
    aid_type: str
    product_name: Optional[str]
    amount: Optional[float]
    status: TransactionStatus
    verified_by: Optional[int]
    verified_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True

class SuggestionCreate(BaseModel):
    user_id: Optional[int] = None
    message: str

class SuggestionResponse(BaseModel):
    id: int
    user_id: Optional[int]
    message: str
    created_at: datetime

    class Config:
        from_attributes = True
