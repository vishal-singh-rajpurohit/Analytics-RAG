from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserCredentials(BaseModel):
    name: Optional[str] = Field(default=None, description="The user's full name")
    email: EmailStr = Field(..., description="The user's email address")
    password: str = Field(..., description="The user's password")
    confirm_password: Optional[str] = Field(default=None, description="The user's password confirmation")
    is_register: Optional[bool] = Field(default=None, description="Explicit registration flag")


class OAuthPayload(BaseModel):
    name: Optional[str] = Field(default=None, description="The user's name from OAuth provider")
    email: EmailStr = Field(..., description="The email address from OAuth provider")
    image: Optional[str] = Field(default=None, description="The user's profile image URL")
    provider_account_id: str = Field(..., description="The provider account ID (sub)")
    access_token: Optional[str] = Field(default=None, description="The OAuth provider access token")
    id_token: Optional[str] = Field(default=None, description="The OAuth provider ID token")
    expires_at: Optional[int] = Field(default=None, description="Token expiration timestamp in seconds")


class AuthResponse(BaseModel):
    id: str = Field(..., description="The user's unique identifier")
    name: Optional[str] = Field(default=None, description="The user's name")
    email: EmailStr = Field(..., description="The user's email address")
    image: Optional[str] = Field(default=None, description="The user's profile image URL")
    access_token: str = Field(..., description="The signed JWT access token")