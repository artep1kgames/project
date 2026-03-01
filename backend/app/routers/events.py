from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy import or_
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional
from datetime import datetime
from database import get_db
from models import models
from schemas import schemas
from utils.auth import get_current_user
import shutil
import os
from pathlib import Path
from services.event_service import create_event as create_event_service, get_event, update_event, delete_event

router = APIRouter(
    tags=["events"]
)

UPLOAD_DIR = Path("uploads/events")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/", response_model=schemas.EventResponse)
async def create_event(
    event: schemas.EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in [models.UserRole.ORGANIZER, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can create events"
        )

    # Получаем или создаём категорию по типу мероприятия
    # Тип мероприятия должен быть передан в category_ids[0] или в отдельном поле
    event_type_category_name = None
    
    # Если есть category_ids, берем первую категорию как тип мероприятия
    if event.category_ids and len(event.category_ids) > 0:
        category_query = select(models.Category).where(models.Category.id == event.category_ids[0])
        category_result = await db.execute(category_query)
        category = category_result.scalar_one_or_none()
        if category:
            event_type_category_name = category.name
    
    # Если категория не найдена, создаем мероприятие без автоматической категории
    categories = []
    if event_type_category_name:
        # Добавляем категорию по типу мероприятия
        event_type_category = await db.execute(select(models.Category).where(models.Category.name == event_type_category_name))
        event_type_category_obj = event_type_category.scalar_one_or_none()
        if event_type_category_obj:
            categories.append(event_type_category_obj)

    # Добавляем остальные категории из запроса
    if len(event.category_ids) > 1:
        query = select(models.Category).where(models.Category.id.in_(event.category_ids[1:]))
        result = await db.execute(query)
        additional_categories = result.scalars().all()
        categories.extend(additional_categories)

    db_event = models.Event(
        **event.dict(exclude={'category_ids'}),
        organizer_id=current_user.id,
        status=models.EventStatus.PENDING
    )
    db_event.categories = categories

    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)

    # Явно загружаем связанные объекты
    categories = []
    if db_event.id:
        result = await db.execute(
            select(models.Category).join(models.event_categories).where(models.event_categories.c.event_id == db_event.id)
        )
        categories = result.scalars().all()

    images = []
    if db_event.id:
        result = await db.execute(
            select(models.EventImage).where(models.EventImage.event_id == db_event.id)
        )
        images = result.scalars().all()

    organizer = None
    if db_event.organizer_id:
        result = await db.execute(
            select(models.User).where(models.User.id == db_event.organizer_id)
        )
        organizer = result.scalar_one_or_none()

    event_dict = {
        "id": db_event.id,
        "title": db_event.title,
        "short_description": db_event.short_description,
        "full_description": db_event.full_description,
        "location": db_event.location,
        "start_date": db_event.start_date.isoformat() if db_event.start_date else None,
        "end_date": db_event.end_date.isoformat() if db_event.end_date else None,
        "max_participants": db_event.max_participants,
        "current_participants": db_event.current_participants,
        "status": db_event.status.value if db_event.status else None,
        "event_type": db_event.event_type.value if db_event.event_type else None,
        "ticket_price": db_event.ticket_price,
        "image_url": db_event.image_url,
        "organizer_id": db_event.organizer_id,
        "created_at": db_event.created_at.isoformat() if db_event.created_at else None,
        "rejection_reason": getattr(db_event, "rejection_reason", None),
        "organizer": {
            "id": organizer.id,
            "username": organizer.username,
            "email": organizer.email,
            "full_name": organizer.full_name,
            "role": organizer.role.value if hasattr(organizer, 'role') else None
        } if organizer else None,
        "categories": [
            {
                "id": cat.id,
                "name": cat.name,
                "description": cat.description
            } for cat in categories
        ] if categories else [],
        "images": [
            {
                "id": img.id,
                "image_url": img.image_url,
                "created_at": img.created_at.isoformat() if img.created_at else None
            } for img in images
        ] if images else [],
        "participants": []
    }
    return event_dict

@router.post("/{event_id}/images")
async def upload_event_image(
    event_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    event = await db.get(models.Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.organizer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to upload images for this event")

    file_extension = file.filename.split(".")[-1]
    file_name = f"{event_id}_{datetime.now().timestamp()}.{file_extension}"
    file_path = UPLOAD_DIR / file_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image = models.EventImage(
        event_id=event_id,
        image_url=f"/uploads/events/{file_name}"
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)

    return {"filename": file_name, "url": f"/uploads/events/{file_name}"}

@router.get("/")
async def get_events(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    start_date: Optional[str] = Query(None, description="Start date in ISO format"),
    end_date: Optional[str] = Query(None, description="End date in ISO format"),
    db: AsyncSession = Depends(get_db)
):
    try:
        print("Starting get_events function")
        print(f"Parameters: skip={skip}, limit={limit}, search={search}, start_date={start_date}, end_date={end_date}")
        
        query = select(models.Event).options(
            joinedload(models.Event.organizer),
            selectinload(models.Event.images),
            selectinload(models.Event.categories)
        )
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    models.Event.title.ilike(search_term),
                    models.Event.short_description.ilike(search_term),
                    models.Event.location.ilike(search_term)
                )
            )
        
        # Преобразуем строки в datetime объекты
        start_datetime = None
        end_datetime = None
        
        if start_date:
            try:
                start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.where(models.Event.end_date >= start_datetime)
                print(f"Filtering by start_date: {start_datetime}")
            except ValueError as e:
                print(f"Invalid start_date format: {start_date}, error: {e}")
        
        if end_date:
            try:
                end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.where(models.Event.start_date <= end_datetime)
                print(f"Filtering by end_date: {end_datetime}")
            except ValueError as e:
                print(f"Invalid end_date format: {end_date}, error: {e}")
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        events = result.unique().scalars().all()
        
        print(f"Found {len(events)} events")
        
        # Преобразуем в список словарей для избежания проблем с сериализацией
        events_list = []
        for event in events:
            # Получаем участников для каждого мероприятия
            participants_query = select(models.event_participants).where(
                models.event_participants.c.event_id == event.id
            )
            participants_result = await db.execute(participants_query)
            participants = participants_result.fetchall()
            
            event_dict = {
                "id": event.id,
                "title": event.title,
                "short_description": event.short_description,
                "full_description": event.full_description,
                "location": event.location,
                "start_date": event.start_date.isoformat() if event.start_date else None,
                "end_date": event.end_date.isoformat() if event.end_date else None,
                "max_participants": event.max_participants,
                "current_participants": event.current_participants,
                "status": event.status.value if event.status else None,
                "event_type": event.event_type.value if event.event_type else None,
                "ticket_price": event.ticket_price,
                "image_url": event.image_url,
                "organizer_id": event.organizer_id,
                "created_at": event.created_at.isoformat() if event.created_at else None,
                "rejection_reason": getattr(event, "rejection_reason", None),
                "organizer": {
                    "id": event.organizer.id,
                    "username": event.organizer.username,
                    "email": event.organizer.email,
                    "full_name": event.organizer.full_name,
                    "role": event.organizer.role.value if hasattr(event.organizer, 'role') else None
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
                ] if event.images else [],
                "participants": [
                    {
                        "user_id": p.user_id,
                        "event_id": p.event_id,
                        "ticket_purchased": p.ticket_purchased
                    } for p in participants
                ] if participants else []
            }
            events_list.append(event_dict)
        
        print(f"Returning {len(events_list)} events")
        return events_list
        
    except Exception as e:
        print(f"Error in get_events: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/my", response_model=List[schemas.EventResponse])
async def get_my_events(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = select(models.Event).where(
            models.Event.organizer_id == current_user.id
    ).options(
        selectinload(models.Event.images),
        selectinload(models.Event.categories)
    )
    result = await db.execute(query)
    events = result.scalars().all()
    return events

@router.get("/{event_id}")
async def get_event(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    try:
        print(f"Получен запрос на детали мероприятия с ID: {event_id}")
        
        query = select(models.Event).where(
            models.Event.id == event_id
        ).options(
            joinedload(models.Event.organizer),
            selectinload(models.Event.images),
            selectinload(models.Event.categories)
        )
        result = await db.execute(query)
        event = result.scalar_one_or_none()
        
        if event is None:
            print(f"Мероприятие с ID {event_id} не найдено")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        print(f"Мероприятие найдено: {event.title}")
        
        # Получаем участников мероприятия
        participants_query = select(models.event_participants).where(
            models.event_participants.c.event_id == event_id
        )
        participants_result = await db.execute(participants_query)
        participants = participants_result.fetchall()
        
        print(f"Найдено участников: {len(participants)}")
        
        # Преобразуем в словарь для избежания проблем с сериализацией
        event_dict = {
            "id": event.id,
            "title": event.title,
            "short_description": event.short_description,
            "full_description": event.full_description,
            "location": event.location,
            "start_date": event.start_date.isoformat() if event.start_date else None,
            "end_date": event.end_date.isoformat() if event.end_date else None,
            "max_participants": event.max_participants,
            "current_participants": event.current_participants,
            "status": event.status.value if event.status else None,
            "event_type": event.event_type.value if event.event_type else None,
            "ticket_price": event.ticket_price,
            "image_url": event.image_url,
            "organizer_id": event.organizer_id,
            "created_at": event.created_at.isoformat() if event.created_at else None,
            "rejection_reason": getattr(event, "rejection_reason", None),
            "organizer": {
                "id": event.organizer.id,
                "username": event.organizer.username,
                "email": event.organizer.email,
                "full_name": event.organizer.full_name,
                "role": event.organizer.role.value if hasattr(event.organizer, 'role') else None
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
            ] if event.images else [],
            "participants": [
                {
                    "user_id": p.user_id,
                    "event_id": p.event_id,
                    "ticket_purchased": p.ticket_purchased
                } for p in participants
            ] if participants else []
        }
        
        print(f"Возвращаем данные мероприятия: {event_dict['title']}")
        return event_dict
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_event: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.put("/{event_id}", response_model=schemas.EventResponse)
async def update_event_by_id(event_id: int, event: schemas.EventCreate, db: AsyncSession = Depends(get_db)):
    """
    Обновить информацию о мероприятии
    """
    updated_event = await update_event(db, event_id, event)
    if not updated_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return updated_event

@router.delete("/{event_id}")
async def delete_event_by_id(event_id: int, db: AsyncSession = Depends(get_db)):
    """
    Удалить мероприятие
    """
    success = await delete_event(db, event_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return {"message": "Event deleted successfully"}

@router.post("/{event_id}/participate", response_model=schemas.ParticipationResponse)
async def participate_in_event(
    event_id: int,
    participation: schemas.ParticipationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Получаем мероприятие
    query = select(models.Event).where(models.Event.id == event_id)
    result = await db.execute(query)
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.status != models.EventStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail="Cannot participate in unapproved event"
        )

    if event.current_participants >= event.max_participants:
        raise HTTPException(
            status_code=400,
            detail="Event is full"
        )

    # Проверяем, не участвует ли пользователь уже
    query = select(models.event_participants).where(
        models.event_participants.c.user_id == current_user.id,
        models.event_participants.c.event_id == event_id
    )
    result = await db.execute(query)
    existing_participation = result.first()
    
    if existing_participation:
        raise HTTPException(
            status_code=400,
            detail="Already participating in this event"
        )

    # Для платных мероприятий требуется покупка билета
    if event.event_type == models.EventType.PAID and not participation.ticket_purchased:
        raise HTTPException(
            status_code=400,
            detail="This is a paid event. Please purchase a ticket to participate"
        )

    # Добавляем участие
    await db.execute(
        models.event_participants.insert().values(
            user_id=current_user.id,
            event_id=event_id,
            ticket_purchased=participation.ticket_purchased
        )
    )

    # Увеличиваем счетчик участников
    event.current_participants += 1
    await db.commit()

    return schemas.ParticipationResponse(
        user_id=current_user.id,
        event_id=event_id,
        ticket_purchased=participation.ticket_purchased,
        created_at=datetime.utcnow()
    )

@router.delete("/{event_id}/participate")
async def cancel_participation(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Получаем мероприятие
    query = select(models.Event).where(models.Event.id == event_id)
    result = await db.execute(query)
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Проверяем, участвует ли пользователь в мероприятии
    query = select(models.event_participants).where(
        models.event_participants.c.user_id == current_user.id,
        models.event_participants.c.event_id == event_id
    )
    result = await db.execute(query)
    existing_participation = result.first()
    
    if not existing_participation:
        raise HTTPException(
            status_code=400,
            detail="You are not participating in this event"
        )

    # Удаляем участие
    await db.execute(
        models.event_participants.delete().where(
            models.event_participants.c.user_id == current_user.id,
            models.event_participants.c.event_id == event_id
        )
    )

    # Уменьшаем счетчик участников
    event.current_participants = max(0, event.current_participants - 1)
    await db.commit()

    return {"message": "Participation cancelled successfully"} 