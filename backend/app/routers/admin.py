from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload
from typing import List
from database import get_db
from models import models
from schemas import schemas
from utils.auth import get_current_user

router = APIRouter(
    tags=["admin"]
)

def get_admin_user(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access this endpoint"
        )
    return current_user

@router.get("/events", response_model=List[schemas.EventResponse])
async def get_events(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Получение списка всех мероприятий"""
    events = await db.execute(select(models.Event).options(
        joinedload(models.Event.organizer),
        selectinload(models.Event.images),
        selectinload(models.Event.categories)
    ))
    events = events.unique().scalars().all()
    
    events_data = []
    for event in events:
        event_dict = {
            "id": event.id,
            "title": event.title,
            "description": event.full_description,
            "short_description": event.short_description,
            "start_date": event.start_date.isoformat() if event.start_date else None,
            "end_date": event.end_date.isoformat() if event.end_date else None,
            "location": event.location,
            "max_participants": event.max_participants,
            "current_participants": event.current_participants,
            "status": event.status.value if event.status else None,
            "event_type": event.event_type.value if event.event_type else None,
            "organizer_id": event.organizer_id,
            "organizer": {
                "id": event.organizer.id,
                "username": event.organizer.username,
                "email": event.organizer.email,
                "full_name": event.organizer.full_name
            } if event.organizer else None,
            "categories": [
                {
                    "id": cat.id,
                    "name": cat.name,
                    "description": cat.description
                } for cat in event.categories
            ] if event.categories else [],
            "images": [
                {
                    "id": img.id,
                    "image_url": img.image_url,
                    "created_at": img.created_at.isoformat() if img.created_at else None
                } for img in event.images
            ] if event.images else []
        }
        events_data.append(event_dict)
    
    return events_data

@router.post("/events/{event_id}/approve")
async def approve_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can approve events"
        )
    
    event = await db.get(models.Event, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event.status = models.EventStatus.APPROVED
    await db.commit()
    await db.refresh(event)
    
    return {"message": "Event approved successfully"}

@router.post("/events/{event_id}/reject")
async def reject_event(
    event_id: int,
    reason: str = Query(..., description="Reason for rejection"),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can reject events"
        )
    
    event = await db.get(models.Event, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Удаляем мероприятие из базы данных
    await db.delete(event)
    await db.commit()
    
    return {"message": "Event rejected and deleted successfully"}

@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete events"
        )
    
    event = await db.get(models.Event, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    await db.delete(event)
    await db.commit()
    
    return {"message": "Event deleted successfully"}

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    return db.query(models.User).offset(skip).limit(limit).all()

@router.put("/users/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int,
    role: models.UserRole,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    db.commit()
    db.refresh(user)
    return user

@router.get("/events/{event_id}")
async def get_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Получение информации о конкретном мероприятии"""
    # Используем select для получения мероприятия с предзагрузкой связанных данных
    stmt = select(models.Event).options(
        joinedload(models.Event.organizer),
        joinedload(models.Event.images),
        selectinload(models.Event.categories)
    ).where(models.Event.id == event_id)
    
    result = await db.execute(stmt)
    event = result.unique().scalar_one_or_none()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Мероприятие не найдено"
        )
    
    # Безопасная сериализация связанных объектов
    organizer = None
    if event.organizer is not None:
        organizer = {
            "id": event.organizer.id,
            "username": event.organizer.username,
            "email": event.organizer.email,
            "full_name": event.organizer.full_name,
            "role": event.organizer.role.value if event.organizer.role else None
        }
    images = []
    if hasattr(event, 'images') and event.images:
        for image in event.images:
            images.append({
                "id": image.id,
                "event_id": image.event_id,
                "image_url": getattr(image, 'url', None),
                "created_at": image.created_at.isoformat() if image.created_at else None
            })
    categories = []
    if hasattr(event, 'categories') and event.categories:
        for category in event.categories:
            categories.append({
                "id": category.id,
                "name": category.name,
                "description": category.description
            })
    event_dict = {
        "id": event.id,
        "title": event.title,
        "short_description": event.short_description,
        "full_description": event.full_description,
        "start_date": event.start_date.isoformat() if event.start_date else None,
        "end_date": event.end_date.isoformat() if event.end_date else None,
        "location": event.location,
        "max_participants": event.max_participants,
        "current_participants": event.current_participants,
        "status": event.status,
        "event_type": event.event_type,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "rejection_reason": event.rejection_reason,
        "organizer_id": event.organizer_id,
        "image_url": getattr(event, 'image_url', None),
        "organizer": organizer,
        "images": images,
        "categories": categories
    }
    
    return event_dict

@router.delete("/events/published", response_model=dict)
async def delete_published_events(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Удаление всех опубликованных мероприятий"""
    try:
        # Получаем все опубликованные мероприятия
        stmt = select(models.Event).where(models.Event.status == models.EventStatus.PUBLISHED)
        result = await db.execute(stmt)
        events = result.scalars().all()
        
        # Удаляем каждое мероприятие
        for event in events:
            await db.delete(event)
        
        await db.commit()
        
        return {
            "message": f"Успешно удалено {len(events)} опубликованных мероприятий",
            "deleted_count": len(events)
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении мероприятий: {str(e)}"
        ) 