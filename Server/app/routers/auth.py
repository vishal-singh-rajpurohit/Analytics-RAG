from urllib import response

from fastapi import APIRouter, status, Depends
from app.db.db import get_db
from app.controllers.auth_controller import login, oauth_login
from app.schema.auth import AuthResponse, OAuthPayload, UserCredentials

router = APIRouter(tags=["Authentication"])


@router.post("/login-credentials", response_model=dict, status_code=status.HTTP_200_OK)
async def login_user(payload: UserCredentials, db=Depends(get_db)):
    return await login(payload, db)

@router.post("/login-oauth", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def login_user(payload: OAuthPayload, db=Depends(get_db)):
    return await oauth_login(payload, db)

