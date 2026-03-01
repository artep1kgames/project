from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class OrganizerResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True

class ImageResponse(BaseModel):
    id: int
    url: str

    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: int
    title: str
    description: str
    start_date: datetime
    end_date: datetime
    location: str
    max_participants: int
    status: EventStatus
    event_type: Optional[str] = None
    organizer: Optional[OrganizerResponse] = None
    images: List[ImageResponse] = []

    class Config:
        from_attributes = True 