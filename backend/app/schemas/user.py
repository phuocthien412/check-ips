from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class UserLogin(BaseModel):
    username: str
    password: str
    remember_me: Optional[bool] = False

class UserBase(BaseModel):
    username: str
    displayName: Optional[str] = "Admin Engineer"
    role: Optional[str] = "Administrator"
    avatarUrl: Optional[str] = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80"
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    displayName: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    avatarUrl: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: Optional[str] = Field(None, alias="_id")
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True

class LoginResponse(BaseModel):
    username: str
    displayName: str
    role: str
    avatarUrl: Optional[str] = None
    isLoggedIn: bool = True
    token: Optional[str] = None
    message: Optional[str] = "Login successful"
