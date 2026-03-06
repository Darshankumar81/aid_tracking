# backend/routers/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db

from .. import models, schemas
from ..deps import get_current_user, require_admin

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=list[schemas.UserResponse])
def list_users(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(models.User).all()

@router.get("/me", response_model=schemas.UserResponse)
def me(current_user = Depends(get_current_user)):
    return current_user

@router.put("/{user_id}/verify", response_model=schemas.UserResponse)
def verify_user(user_id: int, db: Session = Depends(get_db), admin = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.verified = True
    db.commit()
    db.refresh(user)
    return user
