from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)

    @field_validator('password')
    @classmethod
    def truncate_password(cls, v):
        # Обрезаем до 72 байт для bcrypt
        return v.encode('utf-8')[:72].decode('utf-8', errors='ignore')


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=72)

    @field_validator('password')
    @classmethod
    def truncate_password(cls, v):
        # Обрезаем до 72 байт для bcrypt
        return v.encode('utf-8')[:72].decode('utf-8', errors='ignore')


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6, max_length=72)
    is_active: Optional[bool] = None

    @field_validator('password')
    @classmethod
    def truncate_password(cls, v):
        if v:
            return v.encode('utf-8')[:72].decode('utf-8', errors='ignore')
        return v


class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
