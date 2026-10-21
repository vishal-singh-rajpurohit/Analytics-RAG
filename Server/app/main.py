import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db.init_db import init_db, engine
from .config.config import settings
from .routers import auth, analysis

# Ensure upload folders exist
os.makedirs("app/uploads/raw", exist_ok=True)
os.makedirs("app/uploads/charts", exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        print(f"[STARTUP] Notice: Database auto-init warning: {e}")
    yield

    try:
        await engine.dispose()
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-Agent Data Analysis Workspace API powered by LangGraph, Pandas, and Matplotlib",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static charts directory
app.mount(
    f"{settings.API_V1_STR}/analysis/charts-static",
    StaticFiles(directory="app/uploads/charts", check_dir=False),
    name="charts_static"
)
app.mount(
    "/api/analysis/charts-static",
    StaticFiles(directory="app/uploads/charts", check_dir=False),
    name="charts_static_alias"
)

app.include_router(auth.router, prefix=f'{settings.API_V1_STR}/auth', tags=["Authentication"])
app.include_router(analysis.router, prefix=f'{settings.API_V1_STR}/analysis', tags=["Analysis"])

# Alias routes without version prefix for backward compatibility (analysis only; auth is reserved for NextAuth)
app.include_router(analysis.router, prefix="/api/analysis", include_in_schema=False)


@app.get('/')
def root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "docs": "/docs"
    }