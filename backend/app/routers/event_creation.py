from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from database import get_db
from models import models
from schemas import schemas
from utils.auth import get_current_user

router = APIRouter(
    tags=["event_creation"]
)

@router.post("/create", response_model=schemas.EventResponse)
async def create_event(
    event: schemas.EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Создание нового мероприятия
    """
    # Проверка прав доступа
    if current_user.role not in [models.UserRole.ORGANIZER, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только организаторы могут создавать мероприятия"
        )

    try:
        # Создаем объект мероприятия
        db_event = models.Event(
            **event.dict(exclude={'category_ids'}),
            organizer_id=current_user.id,
            status=models.EventStatus.PENDING
        )

        # Добавляем категории
        query = select(models.Category).where(models.Category.id.in_(event.category_ids))
        result = await db.execute(query)
        categories = result.scalars().all()
        
        if len(categories) != len(event.category_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Указаны неверные ID категорий"
            )
        
        db_event.categories = categories

        # Сохраняем в базу данных
        db.add(db_event)
        await db.commit()
        await db.refresh(db_event)

        return db_event

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании мероприятия: {str(e)}"
        ) 