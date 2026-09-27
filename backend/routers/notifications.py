import logging
import os
from typing import List

import deps
import models
import schemas
from fastapi import APIRouter, Depends, HTTPException, status
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from sqlalchemy.orm import Session
from twilio.rest import Client

# Standard Python logger
logger = logging.getLogger("notifications")

# Environment Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "notifications@aidtracker.com")

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# -------------------------------------------------------------
# 1. SMS Dispatcher (Twilio)
# -------------------------------------------------------------
def send_sms_alert(to_phone: str, message_body: str) -> bool:
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
        logger.warning("Twilio credentials missing. SMS skipped.")
        return False

    if not to_phone:
        logger.warning("Recipient phone number missing. SMS skipped.")
        return False

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=to_phone,
        )
        logger.info(f"SMS dispatched to {to_phone}. SID: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS to {to_phone}: {e}")
        return False


# -------------------------------------------------------------
# 2. Email Dispatcher (SendGrid)
# -------------------------------------------------------------
def send_email_alert(to_email: str, subject: str, html_content: str) -> bool:
    if not SENDGRID_API_KEY:
        logger.warning("SendGrid API key missing. Email skipped.")
        return False

    if not to_email:
        logger.warning("Recipient email missing. Email skipped.")
        return False

    try:
        message = Mail(
            from_email=SENDER_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(
            f"Email sent to {to_email}. Status: {response.status_code}"
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send Email to {to_email}: {e}")
        return False


# -------------------------------------------------------------
# 3. Unified Dispatcher (SMS + Email + DB Record)
# -------------------------------------------------------------
def notify_recipient_and_donor(
    db_session: Session,
    recipient_user: models.User,
    donor_user: models.User,
    shipment_details: dict,
):
    product = shipment_details.get("product_name", "Aid Supplies")
    destination = shipment_details.get("destination", "Destination")
    shipment_id = shipment_details.get("id")

    title = f"Shipment #{shipment_id} Dispatched"
    sms_message = (
        f"🚨 AidTracker Alert: Shipment #{shipment_id} ({product}) "
        f"is en route to {destination}. Track status on your dashboard."
    )

    email_subject = f"Aid Shipment #{shipment_id} Dispatched to {destination}"
    email_html = f"""
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Aid Shipment Dispatched</h2>
        <p>Hello <strong>{recipient_user.name}</strong>,</p>
        <p>A new humanitarian shipment has been dispatched to your regional center.</p>
        <ul>
            <li><strong>Shipment ID:</strong> #{shipment_id}</li>
            <li><strong>Item:</strong> {product}</li>
            <li><strong>Quantity:</strong> {shipment_details.get('amount') or shipment_details.get('quantity')}</li>
            <li><strong>Destination:</strong> {destination}</li>
            <li><strong>Donor:</strong> {donor_user.name}</li>
        </ul>
        <p>Log in to your dashboard to track real-time telemetry and verify arrival.</p>
    </div>
    """

    # Create in-app notification record in DB
    if recipient_user and hasattr(recipient_user, "id"):
        db_notification = models.Notification(
            user_id=recipient_user.id,
            title=title,
            message=sms_message,
        )
        db_session.add(db_notification)
        db_session.commit()

    # Send external SMS & Email alerts
    recipient_phone = getattr(
        recipient_user,
        "phone",
        getattr(recipient_user, "phone_number", None),
    )
    if recipient_phone:
        send_sms_alert(recipient_phone, sms_message)

    if getattr(recipient_user, "email", None):
        send_email_alert(recipient_user.email, email_subject, email_html)


# -------------------------------------------------------------
# 4. API Endpoints
# -------------------------------------------------------------
@router.get("/", response_model=List[schemas.NotificationResponse])
def get_user_notifications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """Retrieve all in-app notifications for the logged-in user."""
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .all()
    )


@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    """Mark a specific notification as read."""
    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = True
    db.commit()
    return {"status": "success", "message": "Notification marked as read"}