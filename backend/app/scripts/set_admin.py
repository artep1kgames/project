from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import User, UserRole
from app.database import DATABASE_URL

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def set_admin(email):
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.role = UserRole.ADMIN
        db.commit()
        print(f"User {email} is now admin.")
    else:
        print(f"User {email} not found.")
    db.close()

if __name__ == "__main__":
    set_admin("admin@example.com") 