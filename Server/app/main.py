from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db.init_db import init_db, engine
from .config.config import settings
from .routers import auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        print(f"[STARTUP] Database table initialization warning: {e}")

    yield

    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    penapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )


app.include_router(auth.router, prefix=f'{settings.API_V1_STR}/auth', tags=["Authentication"])

@app.get('/')
def root():
    return {'Status': "OK"}