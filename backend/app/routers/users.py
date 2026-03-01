from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List
from database import get_db
from models import models
from schemas import schemas
from utils.auth import get_current_user, get_password_hash
from datetime import datetime
from sqlalchemy.orm import joinedload, selectinload

router = APIRouter(
    tags=["users"]
)

@router.post("/", response_model=schemas.UserResponse)
async def create_user(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # Проверяем, не существует ли уже пользователь с таким email
    query = select(models.User).where(models.User.email == user.email)
    result = await db.execute(query)
    db_user = result.scalar_one_or_none()
    
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Проверяем, не существует ли уже пользователь с таким username
    query = select(models.User).where(models.User.username == user.username)
    result = await db.execute(query)
    db_user = result.scalar_one_or_none()
    
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Создаем нового пользователя
    hashed_password = get_password_hash(user.password)
    
    # Преобразуем строковую роль в значение перечисления
    try:
        role = models.UserRole(user.role.value if isinstance(user.role, models.UserRole) else user.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {user.role}. Must be one of: {[r.value for r in models.UserRole]}"
        )
    
    db_user = models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(
    current_user: models.User = Depends(get_current_user)
):
    return current_user

@router.get("/", response_model=List[schemas.UserResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    query = select(models.User).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    return users

@router.get("/{user_id}", response_model=schemas.UserResponse)
async def read_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(models.User).where(models.User.id == user_id)
    result = await db.execute(query)
    db_user = result.scalar_one_or_none()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.put("/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    user_id: int,
    user: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id != user_id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    query = select(models.User).where(models.User.id == user_id)
    result = await db.execute(query)
    db_user = result.scalar_one_or_none()
    
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    for field, value in user.dict(exclude_unset=True).items():
        setattr(db_user, field, value)
    
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    query = select(models.User).where(models.User.id == user_id)
    result = await db.execute(query)
    db_user = result.scalar_one_or_none()
    
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(db_user)
    await db.commit()
    return {"message": "User deleted successfully"}

@router.get("/me/events", response_model=List[schemas.EventResponse])
async def read_user_events(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        print(f"Loading events for user {current_user.id} with role {current_user.role}")
        
        # Создаем один запрос с условиями для организатора и участника
        query = select(models.Event).options(
            joinedload(models.Event.organizer),
            selectinload(models.Event.images),
            selectinload(models.Event.categories)
        )

        # Если пользователь организатор, показываем его мероприятия
        if current_user.role == models.UserRole.ORGANIZER:
            print("User is organizer, loading created events")
            query = query.where(models.Event.organizer_id == current_user.id)
        else:
            print("User is participant, loading participated events")
            query = query.where(
                models.Event.id.in_(
                    select(models.event_participants.c.event_id).where(
                        models.event_participants.c.user_id == current_user.id
                    )
                )
            )
        
        result = await db.execute(query)
        events = result.unique().scalars().all()
        print(f"Found {len(events)} events")
        
        return events
    except Exception as e:
        print(f"Error in read_user_events: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading events: {str(e)}"
        )

@router.get("/me/upcoming-events", response_model=List[schemas.EventResponse])
async def read_user_upcoming_events(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = datetime.utcnow()
    
    # Создаем один запрос с условиями для организатора и участника
    query = select(models.Event).options(
        joinedload(models.Event.organizer),
        selectinload(models.Event.images),
        selectinload(models.Event.categories)
    ).where(
        or_(
            models.Event.organizer_id == current_user.id,
            models.Event.id.in_(
                select(models.event_participants.c.event_id).where(
                    models.event_participants.c.user_id == current_user.id
                )
            )
        ),
        models.Event.start_date > now
    ).order_by(models.Event.start_date)
    
    result = await db.execute(query)
    events = result.unique().scalars().all()
    return events

@router.get("/me/past-events", response_model=List[schemas.EventResponse])
async def read_user_past_events(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = datetime.utcnow()
    
    # Создаем один запрос с условиями для организатора и участника
    query = select(models.Event).options(
        joinedload(models.Event.organizer),
        selectinload(models.Event.images),
        selectinload(models.Event.categories)
    ).where(
        or_(
            models.Event.organizer_id == current_user.id,
            models.Event.id.in_(
                select(models.event_participants.c.event_id).where(
                    models.event_participants.c.user_id == current_user.id
                )
            )
        ),
        models.Event.end_date < now
    ).order_by(models.Event.start_date.desc())
    
    result = await db.execute(query)
    events = result.unique().scalars().all()
    return events 