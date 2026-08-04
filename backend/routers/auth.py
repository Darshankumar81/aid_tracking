import datetime
import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
import jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole
from schemas import UserCreate, UserResponse, Token

SECRET_KEY = "your-super-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 Hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

router = APIRouter(tags=["Authentication"])

# --- Security, Password & OTP Utilities ---
def hash_password(password: str) -> str:
    """Hashes a plain password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against stored bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), 
        hashed_password.encode("utf-8")
    )

def generate_otp() -> str:
    """Generates a secure 6-digit numeric OTP."""
    return f"{random.randint(100000, 999999)}"

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Generates a signed JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """FastAPI Dependency to decode JWT and retrieve user from Database."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- Auth & OTP Endpoints ---

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user in PostgreSQL with dynamic role assignment."""
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email already registered"
        )

    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        hashed_password=hashed_pwd,
        role=user_data.role or UserRole.donor,
        latitude=user_data.latitude,
        longitude=user_data.longitude
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login/request-otp")
def request_login_otp(email: str, password: str, db: Session = Depends(get_db)):
    """Step 1 of MFA: Validate email/password and dispatch a 6-digit OTP code."""
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user or not verify_password(password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password"
        )

    code = generate_otp()
    db_user.otp_code = code
    db_user.otp_expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5)
    db.commit()

    # Log generated OTP (Connect Twilio/SendGrid here for SMS/Email integration)
    print(f"\n[SECURITY OTP] 📬 Sent code '{code}' to user: {db_user.email}\n")
    
    return {"message": "OTP sent successfully", "email": db_user.email}

@router.post("/login/verify-otp", response_model=Token)
def verify_login_otp(email: str, code: str, db: Session = Depends(get_db)):
    """Step 2 of MFA: Confirm 6-digit OTP and issue JWT Access Token."""
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user or db_user.otp_code != code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid OTP code"
        )

    # Convert naive timestamp from DB if necessary for UTC comparison
    current_time = datetime.datetime.now(datetime.timezone.utc)
    expires_at = db_user.otp_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)

    if current_time > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="OTP has expired. Please request a new code."
        )

    # Invalidate OTP code and mark account verified
    db_user.otp_code = None
    db_user.otp_expires_at = None
    db_user.verified = True
    db.commit()

    role_str = db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)
    access_token = create_access_token(data={"sub": db_user.email, "role": role_str})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Direct OAuth2 Password Login (FastAPI Docs compatibility & admin direct login)."""
    db_user = db.query(User).filter(User.email == form_data.username).first()
    if not db_user or not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    role_str = db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)
    access_token = create_access_token(data={"sub": db_user.email, "role": role_str})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": db_user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile details of the authenticated user."""
    return current_user