from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin
from app.utils.security import get_current_user
from app.models.user import User
from typing import Optional, Union

router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Регистрация нового пользователя"""
    auth_service = AuthService(db)

    try:
        new_user = await auth_service.register(user)
        return new_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=Token)
async def login(
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(),
    db: AsyncSession = Depends(get_db),
    login_data: Optional[UserLogin] = None,
):
    """Вход пользователя (получение JWT токена)"""
    auth_service = AuthService(db)

    # Поддержка обоих форматов: form-data и JSON
    if form_data:
        email = form_data.username
        password = form_data.password
    elif login_data:
        email = login_data.email
        password = login_data.password
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Требуется email и пароль",
        )

    user = await auth_service.authenticate(email, password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = await auth_service.create_token(user)

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Получить текущую информацию о пользователе"""
    return current_user
