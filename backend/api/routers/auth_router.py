"""
Router: POST /api/v1/auth/login
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime

from database import get_db
from models import User
from schemas import LoginRequest, LoginResponse, UserResponse
from auth import verify_password, create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

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
