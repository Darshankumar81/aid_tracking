from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import JWTError, jwt

SECRET_KEY = "YOUR_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Shared In-Memory Storage (Replace with DB Session later)
db_users = {
    "admin@aid.com": {
        "email": "admin@aid.com",
        "password": pwd_context.hash("admin123"),
        "name": "Admin User",
        "role": "admin"
    }
}

db_transactions = [
    {
        "id": 1,
        "aid_type": "medical",
        "product_name": "First Aid Kits & Antibiotics",
        "amount": 500,
        "status": "in_transit",
        "is_verified": False,
        "created_by": "donor@aid.org"
    },
    {
        "id": 2,
        "aid_type": "food",
        "product_name": "Emergency Grain Rations",
        "amount": 1200,
        "status": "delivered",
        "is_verified": True,
        "created_by": "donor@aid.org"
    }
]

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None or email not in db_users:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    return db_users[email]