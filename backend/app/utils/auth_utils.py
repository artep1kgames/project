from passlib.context import CryptContext
import bcrypt

# Создаем контекст для хеширования паролей
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Указываем количество раундов явно
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверяет соответствие пароля его хешу
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Создает хеш пароля
    """
    return pwd_context.hash(password)

def hash_password(password: str) -> str:
    """
    Альтернативный метод хеширования пароля напрямую через bcrypt
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def verify_password_direct(plain_password: str, hashed_password: str) -> bool:
    """
    Альтернативный метод проверки пароля напрямую через bcrypt
    """
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode()) 