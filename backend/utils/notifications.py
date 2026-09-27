from models import Notification
from sqlalchemy.orm import Session


def create_notification(db: Session, user_id: int, title: str, message: str):
    """Utility function to insert a notification into the database."""
    notification = Notification(user_id=user_id, title=title, message=message)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification