import uuid
from typing import Optional
from sqlalchemy import select
from fastapi import Request, Response, status, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.config import settings
from app.db.db import get_db
from app.models.auth import Account, User
from app.schema.auth import UserCredentials, OAuthPayload, AuthResponse
from app.utils.tokens import (
    verify_password,
    hash_password,
    create_access_token,
    decode_token,
    clear_cookies,
)


async def get_current_user_optional(
    request: Request, db: Optional[AsyncSession] = Depends(get_db)
) -> Optional[User]:
    """
    Extracts the authenticated user from the Authorization header Bearer token
    or from the access_token cookie. Returns None if unauthenticated.
    """
    token: Optional[str] = None

    # 1. Authorization header takes highest priority (prevents stale cookies from blocking auth)
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    # 2. Fall back to access_token cookie
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        return None

    try:
        payload = decode_token(token)
        if not payload.get("sub") or not payload.get("id"):
            return None
        user_id = uuid.UUID(str(payload.get("id")))
    except Exception:
        # If Bearer token attempt failed and there is a cookie, try cookie as last resort
        if auth_header and request.cookies.get("access_token"):
            try:
                cookie_token = request.cookies.get("access_token")
                payload = decode_token(cookie_token)
                if not payload.get("sub") or not payload.get("id"):
                    return None
                user_id = uuid.UUID(str(payload.get("id")))
            except Exception:
                return None
        else:
            return None

    user = None
    if user_id and db is not None:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

    # Fallback: if user_id was not found but token has a valid email in sub, look up by email
    if not user and payload.get("sub") and db is not None:
        stmt = select(User).where(User.email == str(payload.get("sub")).strip().lower())
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None

    return user


async def get_current_user(
    request: Request, db: Optional[AsyncSession] = Depends(get_db)
) -> User:
    """
    Dependency that enforces authentication. Raises 401 if missing or invalid.
    """
    user = await get_current_user_optional(request, db)

    if not user:
        auth_hdr = request.headers.get("Authorization") or request.headers.get("authorization")
        has_bearer = bool(auth_hdr and auth_hdr.lower().startswith("bearer "))
        has_cookie = bool(request.cookies.get("access_token"))
        print(f"[AUTH NOTICE] 401 Unauthorized for {request.method} {request.url.path} (has_bearer={has_bearer}, has_cookie={has_cookie})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def login(
    resp: Response, payload: UserCredentials, db: AsyncSession = Depends(get_db)
):
    """
    Handles user login or registration using email and password.
    Separates login and registration cleanly using the is_register flag
    or inferred from presence of name and confirm_password.
    """
    if not payload.email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required.",
        )

    normalized_email = str(payload.email).strip().lower()

    # Determine registration vs login flow
    is_register_flow = (
        payload.is_register is True
        or (
            payload.is_register is None
            and bool(payload.name and payload.confirm_password)
        )
    )

    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()

    if is_register_flow:
        # --- REGISTRATION FLOW ---
        if user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists. Please log in.",
            )

        if not payload.confirm_password or payload.confirm_password != payload.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match.",
            )

        hashed_pwd = hash_password(payload.password)

        try:
            new_user = User(
                name=payload.name or normalized_email.split("@")[0],
                email=normalized_email,
                hashed_password=hashed_pwd,
                is_active=True,
                is_verified=False,
            )
            db.add(new_user)
            await db.flush()
            await db.commit()

            access_token = create_access_token(email=new_user.email, id=new_user.id)

            resp.set_cookie(
                key="access_token",
                value=access_token,
                path="/",
                httponly=settings.COOKIE_HTTPONLY,
                secure=settings.COOKIE_SECURE,
                samesite=settings.COOKIE_SAMESITE,
            )

            return {
                "message": "Registration successful",
                "access_token": access_token,
                "user": {
                    "id": str(new_user.id),
                    "name": new_user.name,
                    "email": new_user.email,
                    "is_active": new_user.is_active,
                    "is_verified": new_user.is_verified,
                },
            }

        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error creating account: {str(e)}",
            )

    else:
        # --- LOGIN FLOW ---
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account was registered using Google OAuth. Please sign in with Google.",
            )

        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated.",
            )

        access_token = create_access_token(email=user.email, id=user.id)

        resp.set_cookie(
            key="access_token",
            value=access_token,
            path="/",
            httponly=settings.COOKIE_HTTPONLY,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
        )

        return {
            "message": "Login successful",
            "access_token": access_token,
            "user": {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
            },
        }


async def oauth_login(payload: OAuthPayload, db: AsyncSession = Depends(get_db)):
    """
    Handles Google OAuth token sync and user registration/login.
    """
    if not payload.email or not payload.provider_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and provider account ID are required.",
        )

    normalized_email = str(payload.email).strip().lower()

    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=normalized_email,
            name=payload.name or normalized_email.split("@")[0],
            image=payload.image,
            is_verified=True,
            is_active=True,
        )
        db.add(user)
        await db.flush()

    acc_result = await db.execute(
        select(Account).where(
            Account.provider == "google",
            Account.provider_account_id == payload.provider_account_id,
        )
    )
    account = acc_result.scalar_one_or_none()

    if not account:
        account = Account(
            user_id=user.id,
            provider="google",
            provider_account_id=payload.provider_account_id,
            access_token=payload.access_token,
            id_token=payload.id_token,
            expires_at=payload.expires_at,
        )
        db.add(account)
    else:
        if payload.access_token:
            account.access_token = payload.access_token
        if payload.id_token:
            account.id_token = payload.id_token
        if payload.expires_at:
            account.expires_at = payload.expires_at

    await db.commit()

    token = create_access_token(user.email, user.id)

    return AuthResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        image=user.image,
        access_token=token,
    )


async def logout(resp: Response, current_user: Optional[User] = None):
    """
    Clears the access_token cookie.
    """
    clear_cookies(resp)
    return {"message": "Logged Out"}


async def me(current_user: Optional[User] = None, db: AsyncSession = Depends(get_db)):
    """
    Returns the current authenticated user profile.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(current_user.email, current_user.id)

    return {
        "message": "User profile retrieved",
        "access_token": access_token,
        "user": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "image": current_user.image,
            "is_active": current_user.is_active,
            "is_verified": current_user.is_verified,
        },
    }
