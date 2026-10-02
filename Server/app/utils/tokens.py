from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
import uuid
from passlib.context import CryptContext

from app.config.config import settings

ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def verify_password(hash_password: str, password: str) -> str:
    return pwd_context.verify(password, hash_password)

async def hash_password(password: str) -> str:
    return pwd_context.hash(password)

async def create_access_token(email: str, id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode = {
        "id": str(id),
        "sub": str(email),
        "exp": expire
        }
    return jwt.encode(to_encode, settings.ACCESS_TOKEN_SECRET, algorithm=ALGORITHM)