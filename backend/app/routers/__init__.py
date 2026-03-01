# Пустой файл для обозначения пакета 

# Экспорт всех роутеров
from . import auth
from . import events
from . import users
from . import calendar
from . import admin
from . import event_creation
from . import categories

__all__ = [
    'auth',
    'events', 
    'users',
    'calendar',
    'admin',
    'event_creation',
    'categories'
] 