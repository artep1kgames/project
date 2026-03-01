from sqladmin.authentication import AuthenticationBackend
from fastapi import Request
from fastapi.responses import RedirectResponse
from utils.auth import verify_token, create_access_token
from models.models import User, UserRole
from sqlalchemy.ext.asyncio import AsyncSession
from database import engine
from sqlalchemy import select
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        try:
            form = await request.form()
            email = form.get("username")
            password = form.get("password")
            
            logger.info(f"Login attempt for email: {email}")
            
            if not email or not password:
                logger.error("Missing email or password")
                return False
            
            async with AsyncSession(engine) as session:
                result = await session.execute(
                    select(User).where(User.email == email)
                )
                user = result.scalar_one_or_none()
                
                if not user:
                    logger.error(f"User not found: {email}")
                    return False
                    
                if not user.verify_password(password):
                    logger.error(f"Invalid password for user: {email}")
                    return False
                    
                if user.role != UserRole.ADMIN:
                    logger.error(f"User is not admin: {email}")
                    return False
                    
                token = create_access_token({"sub": user.email})
                request.session.update({"token": token})
                logger.info(f"Successful login for admin: {email}")
                return True
                
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("token")
        
        if not token:
            return False
            
        try:
            async with AsyncSession(engine) as session:
                user = await verify_token(token, session)
                return user is not None and user.role == UserRole.ADMIN
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return False 