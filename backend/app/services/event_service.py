from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.models import Event
from schemas.schemas import EventCreate
from fastapi import HTTPException, status

async def create_event(db: AsyncSession, event: EventCreate):
    """
    Создать новое мероприятие
    """
    db_event = Event(**event.dict())
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    return db_event

async def get_event(db: AsyncSession, event_id: int):
    """
    Получить мероприятие по ID
    """
    result = await db.execute(select(Event).filter(Event.id == event_id))
    return result.scalar_one_or_none()

async def update_event(db: AsyncSession, event_id: int, event: EventCreate):
    """
    Обновить мероприятие
    """
    db_event = await get_event(db, event_id)
    if not db_event:
        return None
    
    for key, value in event.dict().items():
        setattr(db_event, key, value)
    
    await db.commit()
    await db.refresh(db_event)
    return db_event

async def delete_event(db: AsyncSession, event_id: int):
    """
    Удалить мероприятие
    """
    db_event = await get_event(db, event_id)
    if not db_event:
        return False
    
    await db.delete(db_event)
    await db.commit()
    return True 