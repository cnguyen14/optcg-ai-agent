from pydantic import BaseModel, EmailStr, UUID4
from datetime import datetime


class UserCreate(BaseModel):
    """Schema for user registration"""

    email: EmailStr
    username: str
    password: str


class UserResponse(BaseModel):
    """User response schema"""

    id: UUID4
    email: str
    username: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True
