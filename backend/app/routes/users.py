from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from database import get_db
from models import models
from schemas import schemas
from utils.auth import get_current_user, get_password_hash
from datetime import datetime

router = APIRouter(
    prefix="/users",
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
    db_user = models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role
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

@router.get("/me/upcoming-events", response_model=List[schemas.EventResponse])
async def read_user_upcoming_events(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Event).join(
        models.EventParticipation
    ).where(
        models.EventParticipation.user_id == current_user.id,
        models.EventParticipation.status == "registered",
        models.Event.start_date > datetime.utcnow()
    ).order_by(models.Event.start_date)
    
    result = await db.execute(query)
    events = result.scalars().all()
    return events

@router.get("/me/past-events", response_model=List[schemas.EventResponse])
async def read_user_past_events(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Event).join(
        models.EventParticipation
    ).where(
        models.EventParticipation.user_id == current_user.id,
        models.EventParticipation.status == "attended",
        models.Event.end_date < datetime.utcnow()
    ).order_by(models.Event.start_date.desc())
    
    result = await db.execute(query)
    events = result.scalars().all()
    return events

@router.get("/me/events", response_model=List[schemas.EventResponse])
async def read_user_organized_events(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != models.UserRole.ORGANIZER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can access this endpoint"
        )
    
    query = select(models.Event).where(
        models.Event.organizer_id == current_user.id
    ).order_by(models.Event.start_date)
    
    result = await db.execute(query)
    events = result.scalars().all()
    return events

@router.put("/me", response_model=schemas.UserResponse)
async def update_user_me(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user_update.email:
        # Проверяем, не занят ли email другим пользователем
        query = select(models.User).where(
            models.User.email == user_update.email,
            models.User.id != current_user.id
        )
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_update.email

    if user_update.username:
        # Проверяем, не занят ли username другим пользователем
        query = select(models.User).where(
            models.User.username == user_update.username,
            models.User.id != current_user.id
        )
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        current_user.username = user_update.username

    if user_update.full_name:
        current_user.full_name = user_update.full_name

    if user_update.password:
        current_user.hashed_password = get_password_hash(user_update.password)

    await db.commit()
    await db.refresh(current_user)
    return current_user

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