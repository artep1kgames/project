from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Используем переменную окружения для пути к базе данных или значение по умолчанию
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite+aiosqlite:///./events.db')

engine = create_async_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close() 