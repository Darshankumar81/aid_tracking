# backend/models.py
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base
import enum

class UserRole(str, enum.Enum):
    donor = "donor"
    recipient = "recipient"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.donor, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions_given = relationship("Transaction", back_populates="donor", foreign_keys="Transaction.donor_id")
    transactions_received = relationship("Transaction", back_populates="recipient", foreign_keys="Transaction.recipient_id")
    suggestions = relationship("Suggestion", back_populates="user")

class TransactionStatus(str, enum.Enum):
    pending = "pending"
    in_transit = "in_transit"
    delivered = "delivered"
    verified = "verified"

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    aid_type = Column(String, nullable=False)  # money / product
    product_name = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.pending)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    donor = relationship("User", back_populates="transactions_given", foreign_keys=[donor_id])
    recipient = relationship("User", back_populates="transactions_received", foreign_keys=[recipient_id])
    tracking = relationship("Tracking", back_populates="transaction", uselist=True)

class Tracking(Base):
    __tablename__ = "tracking"
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    current_lat = Column(Float, nullable=False)
    current_lon = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="tracking")

class Suggestion(Base):
    __tablename__ = "suggestions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="suggestions")
