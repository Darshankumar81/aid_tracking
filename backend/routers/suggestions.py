# backend/routers/suggestions.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user
from backend.deps import get_current_user, require_admin


router = APIRouter(prefix="/suggestions", tags=["suggestions"])

@router.post("/", response_model=schemas.SuggestionResponse)
def create_suggestion(payload: schemas.SuggestionCreate, db: Session = Depends(get_db), user = Depends(get_current_user)):
    suggestion = models.Suggestion(user_id=payload.user_id or user.id, message=payload.message)
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion

@router.get("/", response_model=list[schemas.SuggestionResponse])
def list_suggestions(db: Session = Depends(get_db), admin = Depends(require_admin)):
    return db.query(models.Suggestion).order_by(models.Suggestion.created_at.desc()).all()
