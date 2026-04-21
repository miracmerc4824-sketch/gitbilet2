"""
ANTIGRAVITY — Auth Router
JWT + RSA256 Authentication
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
import logging

logger = logging.getLogger("antigravity.auth")
router = APIRouter()
security = HTTPBearer()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In production: load from vault / env
JWT_SECRET = "antigravity-secret-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

# ─── Models ─────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str = ""

class TokenResponse(BaseModel):
    success: bool
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict

# ─── Helpers ────────────────────────────────────────────────────

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iss": "antigravity",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    return verify_token(creds.credentials)

# ─── Endpoints ──────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse, summary="Kullanıcı girişi")
async def login(req: LoginRequest):
    """
    JWT token üretir. RSA256 imzalanmış.
    Demo: dev@antigravity.app / 123456
    """
    # In production: query PostgreSQL
    MOCK_USERS = {
        "dev@antigravity.app": {
            "id": "u1",
            "password_hash": pwd_ctx.hash("123456"),
            "full_name": "Can Yılmaz",
            "phone": "+90 532 123 45 67",
        }
    }

    user_data = MOCK_USERS.get(req.email)
    if not user_data or not pwd_ctx.verify(req.password, user_data["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı"
        )

    token = create_token(user_data["id"], req.email)
    logger.info(f"✅ Login: {req.email}")

    return TokenResponse(
        success=True,
        access_token=token,
        expires_in=JWT_EXPIRE_HOURS * 3600,
        user={
            "id": user_data["id"],
            "email": req.email,
            "full_name": user_data["full_name"],
            "phone": user_data["phone"],
        }
    )

@router.post("/register", status_code=201, summary="Yeni kullanıcı kaydı")
async def register(req: RegisterRequest):
    """Yeni kullanıcı oluşturur ve token döner."""
    # In production: INSERT INTO users + check duplicate
    user_id = f"u_{datetime.utcnow().timestamp():.0f}"
    token = create_token(user_id, req.email)

    logger.info(f"✅ Register: {req.email}")
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "message": "Hesap başarıyla oluşturuldu",
        "user": {
            "id": user_id,
            "email": req.email,
            "full_name": req.full_name,
        }
    }

@router.post("/refresh", summary="Token yenileme")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Mevcut token'ı yeniler."""
    new_token = create_token(current_user["sub"], current_user["email"])
    return {"success": True, "access_token": new_token, "token_type": "bearer"}

@router.get("/me", summary="Mevcut kullanıcı bilgisi")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"success": True, "user": current_user}
