from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: str

class UserProfileResponse(BaseModel):
    user_id: str
    username: str
    role: str
    full_name: str
    email: Optional[str] = None
