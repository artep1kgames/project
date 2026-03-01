from pydantic import BaseModel, EmailStr
from typing import Optional, List, ForwardRef
from datetime import datetime
from models.models import UserRole, EventStatus, EventType

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[UserRole] = UserRole.VISITOR

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    role: str

    class Config:
        from_attributes = True

class User(UserResponse):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class EventImageBase(BaseModel):
    image_url: str

class EventImageCreate(EventImageBase):
    pass

class EventImageResponse(EventImageBase):
    id: int
    event_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    name: Optional[str] = None
    description: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True

class EventBase(BaseModel):
    title: str
    short_description: str
    full_description: str
    location: str
    start_date: datetime
    end_date: datetime
    max_participants: int
    event_type: EventType
    ticket_price: Optional[float] = None

class EventCreate(EventBase):
    category_ids: List[int]

class EventUpdate(EventBase):
    category_ids: Optional[List[int]] = None
    status: Optional[EventStatus] = None
    rejection_reason: Optional[str] = None

class EventResponse(EventBase):
    id: int
    created_at: datetime
    current_participants: int
    status: EventStatus
    rejection_reason: Optional[str]
    organizer_id: int
    organizer: Optional[UserResponse]
    image_url: Optional[str]
    images: List[EventImageResponse] = []
    categories: List[CategoryResponse] = []

    class Config:
        from_attributes = True

class ParticipationCreate(BaseModel):
    event_id: int
    ticket_purchased: Optional[bool] = False

class ParticipationResponse(BaseModel):
    user_id: int
    event_id: int
    ticket_purchased: bool
    created_at: datetime

    class Config:
        from_attributes = True 