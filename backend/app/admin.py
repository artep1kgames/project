from sqladmin import ModelView, Admin
from sqlalchemy.orm import Session
from models.models import Event
from models.models import User
from models.models import Category
from database import engine
from fastapi import FastAPI, Depends
from utils.auth import get_current_user
from auth_admin import AdminAuth
from typing import Optional

class UserAdmin(ModelView, model=User):
    name = "Пользователь"
    name_plural = "Пользователи"
    icon = "fa-solid fa-user"
    column_list = [User.id, User.email, User.full_name, User.role]
    column_searchable_list = [User.email, User.full_name]
    column_sortable_list = [User.id, User.email, User.role]
    form_columns = [User.email, User.full_name, User.role, User.is_active]
    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True

class EventAdmin(ModelView, model=Event):
    name = "Мероприятие"
    name_plural = "Мероприятия"
    icon = "fa-solid fa-calendar"
    column_list = [Event.id, Event.title, Event.start_date, Event.location, Event.categories]
    column_searchable_list = [Event.title, Event.location]
    column_sortable_list = [Event.id, Event.start_date, Event.categories]
    form_columns = [Event.title, Event.full_description, Event.start_date, Event.location, Event.categories]
    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True

class CategoryAdmin(ModelView, model=Category):
    name = "Категория"
    name_plural = "Категории"
    icon = "fa-solid fa-tag"
    column_list = [Category.id, Category.name]
    column_searchable_list = [Category.name]
    column_sortable_list = [Category.id, Category.name]
    form_columns = [Category.name]
    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True

def init_admin(app: FastAPI):
    authentication_backend = AdminAuth(secret_key="your-secret-key-here")
    admin = Admin(app, engine, authentication_backend=authentication_backend)
    
    # Добавляем представления
    admin.add_view(UserAdmin)
    admin.add_view(EventAdmin)
    admin.add_view(CategoryAdmin)
    
    return admin 