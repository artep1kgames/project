from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from database import get_db
from models.models import User, UserRole
from schemas.schemas import UserCreate, UserResponse, Token
from utils.auth import verify_password, get_password_hash, create_access_token
from utils.password import verify_password, get_password_hash

router = APIRouter(tags=["auth"])

# Настройки JWT
SECRET_KEY = "your-secret-key-here"  # В продакшене использовать безопасный ключ из переменных окружения
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    print(f"\n=== Получение текущего пользователя ===")
    print(f"Заголовки запроса: {request.headers}")
    print(f"Полученный токен: {token[:10]}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        print(f"Декодированный payload: {payload}")
        
        if username is None:
            print("Username не найден в payload")
            raise credentials_exception
    except JWTError as e:
        print(f"Ошибка декодирования JWT: {e}")
        raise credentials_exception
    
    result = await db.execute(select(User).filter(User.email == username))
    user = result.scalar_one_or_none()
    
    if user is None:
        print(f"Пользователь не найден: {username}")
        raise credentials_exception
    
    print(f"Пользователь найден: {user.email}")
    return user

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Проверяем, не существует ли уже пользователь с таким email
    query = select(User).where(User.email == user.email)
    result = await db.execute(query)
    db_user = result.scalar_one_or_none()
    
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Проверяем, не существует ли уже пользователь с таким username
    query = select(User).where(User.username == user.username)
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
        role = UserRole(user.role.value if isinstance(user.role, UserRole) else user.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {user.role}. Must be one of: {[r.value for r in UserRole]}"
        )
    
    db_user = User(
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

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    print(f"\n=== Попытка входа ===")
    print(f"Email: {form_data.username}")
    
    try:
        # Ищем пользователя по email
        query = select(User).where(User.email == form_data.username)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"Пользователь не найден: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Проверяем пароль
        if not verify_password(form_data.password, user.hashed_password):
            print(f"Неверный пароль для пользователя: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Создаем токен доступа
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        print(f"Успешный вход для пользователя: {form_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка при входе: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication"
        )

@router.get("/me", response_model=UserResponse)
async def read_users_me(request: Request, current_user: User = Depends(get_current_user)):
    print(f"\n=== Получение профиля пользователя ===")
    print(f"Заголовки запроса: {request.headers}")
    print(f"Текущий пользователь: {current_user.email}")
    return current_user

@router.post("/logout")
async def logout():
    # В JWT нет встроенного механизма для выхода, так как токены не хранятся на сервере
    # В реальном приложении можно добавить токен в черный список или использовать refresh tokens
    return {"message": "Successfully logged out"} 