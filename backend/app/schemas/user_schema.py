from pydantic import BaseModel, EmailStr
from typing import Optional, List
import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    secondary_emails: Optional[List[str]] = []
    google_email: Optional[str] = None
    mfa_enabled: Optional[bool] = False
    created_at: datetime.datetime
    has_completed_onboarding: Optional[bool] = False

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class FirebaseLoginSchema(BaseModel):
    id_token: str
    full_name: Optional[str] = None

class OtpRequest(BaseModel):
    email: EmailStr

class OtpVerify(BaseModel):
    email: EmailStr
    otp_code: str
    first_name: str
    last_name: str

class UserProfileUpdateSchema(BaseModel):
    full_name: str

class SecondaryEmailAddSchema(BaseModel):
    email: EmailStr

class GoogleConnectSchema(BaseModel):
    email: EmailStr

class PasswordChangeSchema(BaseModel):
    current_password: str
    new_password: str

class PasswordResetSchema(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str

class MfaToggleSchema(BaseModel):
    enabled: bool
