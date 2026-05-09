"""
POST /api/v1/auth/login
- Verify email + password against users table
- Return JWT + user object matching LoginResponse schema exactly
- If invalid: 401 with detail "Invalid credentials"
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime

from database import get_db
from models import User
from auth import verify_password, create_access_token
from schemas import LoginRequest, LoginResponse, UserResponse

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Update last_active timestamp
    await db.execute(
        update(User).where(User.id == user.id).values(last_active=datetime.utcnow())
    )
    await db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return LoginResponse(
        token=token,
        user=UserResponse(
            id=str(user.id),
            name=user.name,
            email=user.email,
            role=user.role.value,
        ),
    )
