from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from database import get_db
from models import models
from schemas import schemas
from utils.auth import get_current_user

router = APIRouter(
    tags=["categories"]
)

@router.get("/")
async def read_categories(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Эндпоинт для получения категорий из базы данных"""
    try:
        print("Starting read_categories function")
        print(f"Parameters: skip={skip}, limit={limit}")
        query = select(models.Category).offset(skip).limit(limit)
        print(f"Query: {query}")
        
        result = await db.execute(query)
        print("Query executed successfully")
        
        categories = result.scalars().all()
        print(f"Found {len(categories)} categories")
        
        # Преобразуем в список словарей
        categories_list = []
        for category in categories:
            categories_list.append({
                "id": category.id,
                "name": category.name,
                "description": category.description
            })
        
        print(f"Categories: {categories_list}")
        return categories_list
        
    except Exception as e:
        print(f"Error in read_categories: {e}")
        import traceback
        traceback.print_exc()
        
        # В случае ошибки возвращаем статические данные
        fallback_categories = [
            {"id": 1, "name": "CONFERENCE", "description": "Конференция"},
            {"id": 2, "name": "SEMINAR", "description": "Семинар"},
            {"id": 3, "name": "WORKSHOP", "description": "Мастер-класс"},
            {"id": 4, "name": "EXHIBITION", "description": "Выставка"},
            {"id": 5, "name": "CONCERT", "description": "Концерт"},
            {"id": 6, "name": "FESTIVAL", "description": "Фестиваль"},
            {"id": 7, "name": "SPORTS", "description": "Спортивное мероприятие"},
            {"id": 8, "name": "OTHER", "description": "Другое"}
        ]
        return fallback_categories

@router.post("/", response_model=schemas.CategoryResponse)
async def create_category(
    category: schemas.CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create categories"
        )
    
    db_category = models.Category(**category.dict())
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category

@router.get("/{category_id}", response_model=schemas.CategoryResponse)
async def read_category(
    category_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Category).where(models.Category.id == category_id)
    result = await db.execute(query)
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category

@router.put("/{category_id}", response_model=schemas.CategoryResponse)
async def update_category(
    category_id: int,
    category_update: schemas.CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update categories"
        )
    
    query = select(models.Category).where(models.Category.id == category_id)
    result = await db.execute(query)
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    for field, value in category_update.dict(exclude_unset=True).items():
        setattr(category, field, value)
    
    await db.commit()
    await db.refresh(category)
    return category

@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete categories"
        )
    
    query = select(models.Category).where(models.Category.id == category_id)
    result = await db.execute(query)
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Проверяем, есть ли связанные мероприятия
    query = select(models.Event).where(models.Event.category_id == category_id)
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with associated events"
        )
    
    await db.delete(category)
    await db.commit()
    return {"message": "Category deleted successfully"} 