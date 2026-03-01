from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import date
from database import get_db
from models import models
from schemas import schemas

router = APIRouter(
    tags=["calendar"]
)

@router.get("/calendar", response_model=List[schemas.EventResponse])
async def get_calendar_events(db: AsyncSession = Depends(get_db)):
    """Получить все события для календаря"""
    query = select(models.Event)
    result = await db.execute(query)
    events = result.scalars().all()
    return events

@router.get("/date/{date_str}", response_model=List[schemas.EventResponse])
async def get_events_by_date(date_str: str, db: AsyncSession = Depends(get_db)):
    """Получить события на конкретную дату"""
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты")
    
    query = select(models.Event).where(
        models.Event.start_date >= target_date,
        models.Event.start_date < target_date.replace(day=target_date.day + 1)
    )
    result = await db.execute(query)
    events = result.scalars().all()
    return events 