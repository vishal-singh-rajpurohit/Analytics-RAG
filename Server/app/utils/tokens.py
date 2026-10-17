import jwt
import uuid
from fastapi import Response
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

from app.config.config import settings

from typing import Union

ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against a hashed password."""
    if not plain_password or not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def hash_password(password: str) -> str:
    """Hashes a plain-text password."""
    return pwd_context.hash(password)


def create_access_token(email: str, id: Union[uuid.UUID, str]) -> str:
    """Creates a signed JWT access token valid for 60 minutes."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode = {
        "id": str(id),
        "sub": str(email),
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.ACCESS_TOKEN_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decodes a JWT access token."""
    return jwt.decode(token, settings.ACCESS_TOKEN_SECRET, algorithms=[ALGORITHM])


def clear_cookies(resp: Response):
    """Clears authentication cookies."""
    resp.delete_cookie(
        'access_token',
        path='/',
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )