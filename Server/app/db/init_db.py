import asyncio
from sqlalchemy import text
from .db import Base, engine
from app.models.auth import User, Account

async def init_db() -> None:

    async with engine.begin() as conn:
        try:
            await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
            print("[DB-INIT] Extension 'uuid-ossp' is ready.")
        except Exception as e:
            print(f"[DB-INIT] Notice (uuid-ossp): {e}")

        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            print("[DB-INIT] Extension 'vector' (pgvector) is ready.")
        except Exception as e:
            print(f"[DB-INIT] Notice (vector extension not present in host PostgreSQL): {e}")

        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(init_db())