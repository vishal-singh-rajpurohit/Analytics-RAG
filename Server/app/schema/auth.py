from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserCredentials(BaseModel):
    name: Optional[str] = Field(..., description="The user's name")
    email: EmailStr = Field(..., description="The user's email address")
    password: str = Field(..., description="The user's password")
    confirm_password: Optional[str] = Field(..., description="The user's password confirmation")

class OAuthPayload(BaseModel):
    name: Optional[str] = Field(..., description="The user's name")
    email: EmailStr = Field(..., description="The email address by google")
    image: Optional[str] = Field(..., description="The user's profile image")
    provider_account_id: str = Field(..., description="The user's provider account id")
    access_token: str = Field(..., description="The user's access token")
    id_token: str = Field(..., description="The user's id token")
    expires_at: int = Field(..., description="The expiration time of the access token")


class AuthResponse(BaseModel):
    id: str = Field(..., description="The user's unique identifier")
    name: Optional[str] = Field(..., description="The user's name")
    email: EmailStr = Field(..., description="The user's email address")
    image: Optional[str] = Field(..., description="The user's profile image")
    access_token: str = Field(..., description="The access token for authentication")