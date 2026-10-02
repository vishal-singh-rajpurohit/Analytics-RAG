
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Analytics Dashboard"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./app.db"
    # REDIS_URL: str = "redis://localhost:6379"

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    ACCESS_TOKEN_SECRET: str
    REFRESH_TOKEN_SECRET: str

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()