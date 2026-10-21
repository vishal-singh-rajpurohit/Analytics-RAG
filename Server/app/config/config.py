import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Syntropic AI - Multi-Agent Data Analysis Workspace"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql+asyncpg://admin:password@localhost:5431/customer_care_db"
    REDIS_URL: str = "redis://localhost:6379"

    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    ACCESS_TOKEN_SECRET: str = "default_access_token_secret_for_development_purposes_only"
    REFRESH_TOKEN_SECRET: str = "default_refresh_token_secret_for_development_purposes_only"

    # LLM Provider Configuration (Google Gemini / OpenAI)
    LLM_PROVIDER: str = "google"  # "google" | "openai"
    GOOGLE_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL_NAME: str = "gpt-4o-mini"

    # File Storage
    UPLOAD_DIR: str = "app/uploads"
    
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_HTTPONLY: bool = True

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
