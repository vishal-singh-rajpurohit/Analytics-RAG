from typing import Optional
from fastapi import APIRouter, status, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.db import get_db
import app.controllers.auth_controller as auth_controller
from app.schema.auth import AuthResponse, OAuthPayload, UserCredentials
from app.models.auth import User

router = APIRouter(tags=["Authentication"])


@router.post("/login-credentials", response_model=dict, status_code=status.HTTP_200_OK)
async def root(resp: Response, payload: UserCredentials, db=Depends(get_db)):
    return await auth_controller.login(resp, payload, db)

@router.post("/login-oauth", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def root(payload: OAuthPayload, db=Depends(get_db)):
    return await auth_controller.oauth_login(payload, db)

@router.post("/logout", status_code=status.HTTP_200_OK)
async def root(resp: Response,current_user: Optional[User] = Depends(auth_controller.get_current_user_optional)):
    return await auth_controller.logout(resp, current_user)

@router.post("/me", status_code=status.HTTP_200_OK)
async def root(current_user: Optional[User] = Depends(auth_controller.get_current_user_optional), db=Depends(get_db)):
    return await auth_controller.me(current_user, db)

