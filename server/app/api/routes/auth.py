"""T20 — Auth identity endpoint. The frontend calls GET /auth/me right after login."""
from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user
from app.models.schemas import User

router = APIRouter(prefix="/auth")


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    """Return the caller's identity. First call creates the user + their one merchant."""
    return {
        "uid": user.uid,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "photo_url": user.photo_url,
        "merchant_id": user.merchant_id,
        "kyc_status": user.kyc_status,
    }
