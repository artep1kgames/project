from passlib.context import CryptContext

# Настройка хеширования паролей с явным указанием параметров
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,  # Явно указываем количество раундов
    bcrypt__ident="2b"  # Используем современный идентификатор bcrypt
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверяет соответствие пароля его хешу
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Ошибка при проверке пароля: {e}")
        return False

def get_password_hash(password: str) -> str:
    """
    Создает хеш пароля
    """
    try:
        return pwd_context.hash(password)
    except Exception as e:
        print(f"Ошибка при хешировании пароля: {e}")
        raise 