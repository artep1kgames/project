from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table, Boolean, Enum, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base
from utils.password import verify_password

# Таблица для связи many-to-many между пользователями и мероприятиями
event_participants = Table(
    'event_participants',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('event_id', Integer, ForeignKey('events.id')),
    Column('ticket_purchased', Boolean, default=False),
    Column('created_at', DateTime, default=datetime.utcnow)
)

class UserRole(enum.Enum):
    VISITOR = "visitor"
    ORGANIZER = "organizer"
    ADMIN = "admin"

class EventStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class EventType(enum.Enum):
    FREE = "free"
    PAID = "paid"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.VISITOR)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Мероприятия, созданные пользователем (для организаторов)
    created_events = relationship("Event", back_populates="organizer")
    # Мероприятия, в которых участвует пользователь
    participating_events = relationship(
        "Event",
        secondary=event_participants,
        back_populates="participants"
    )

    def verify_password(self, password: str) -> bool:
        return verify_password(password, self.hashed_password)

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    short_description = Column(String)
    full_description = Column(Text)
    location = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    max_participants = Column(Integer)
    current_participants = Column(Integer, default=0)
    image_url = Column(String)
    event_type = Column(Enum(EventType), default=EventType.FREE)
    ticket_price = Column(Float, nullable=True)
    status = Column(Enum(EventStatus), default=EventStatus.PENDING)
    rejection_reason = Column(String, nullable=True)
    organizer_id = Column(Integer, ForeignKey("users.id"))

    organizer = relationship("User", back_populates="created_events")
    participants = relationship(
        "User",
        secondary=event_participants,
        back_populates="participating_events"
    )
    categories = relationship("Category", secondary="event_categories", back_populates="events")
    images = relationship("EventImage", back_populates="event")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)

    events = relationship(
        "Event",
        secondary="event_categories",
        back_populates="categories"
    )

class EventImage(Base):
    __tablename__ = "event_images"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    image_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="images")

# Таблица для связи many-to-many между мероприятиями и категориями
event_categories = Table(
    'event_categories',
    Base.metadata,
    Column('event_id', Integer, ForeignKey('events.id')),
    Column('category_id', Integer, ForeignKey('categories.id'))
) 