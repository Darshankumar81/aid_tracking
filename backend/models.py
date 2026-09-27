import enum
from datetime import datetime
from database import Base
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship


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
    phone_number = Column(String, nullable=True)  # Alias field for compatibility
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.donor, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # --- OTP Verification ---
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)

    transactions_given = relationship(
        "Transaction",
        back_populates="donor",
        foreign_keys="Transaction.donor_id",
    )
    transactions_received = relationship(
        "Transaction",
        back_populates="recipient",
        foreign_keys="Transaction.recipient_id",
    )
    suggestions = relationship("Suggestion", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


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
    aid_type = Column(String, nullable=False)  # Medical Supplies, Food & Water, etc.
    type = Column(String, nullable=True)  # Alias for flexibility
    product_name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=True)
    quantity = Column(Integer, nullable=True)
    status = Column(
        Enum(TransactionStatus),
        default=TransactionStatus.pending,
        nullable=False,
    )

    # --- Location & Destination Columns ---
    location = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    donor = relationship(
        "User",
        back_populates="transactions_given",
        foreign_keys=[donor_id],
    )
    recipient = relationship(
        "User",
        back_populates="transactions_received",
        foreign_keys=[recipient_id],
    )
    tracking = relationship(
        "Tracking", back_populates="transaction", uselist=True
    )


class Tracking(Base):
    __tablename__ = "tracking"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(
        Integer, ForeignKey("transactions.id"), nullable=False
    )
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


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")