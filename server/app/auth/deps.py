"""Auth dependencies — turn a Bearer ID token into a verified, upserted User.

`get_current_user` is the workhorse: it verifies the token, then loads (or on
first sight creates) the `users` row. Creating a user also creates that user's
single linked `Merchant` — the engine subject. One user *is* one merchant; there
is never a second merchant per login.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import Depends, Header, HTTPException

from app.auth.firebase import verify_token
from app.db.mongo import get_db
from app.models.schemas import User


def _provider_from_claims(claims: dict) -> str:
    sign_in = (claims.get("firebase") or {}).get("sign_in_provider", "")
    if "google" in sign_in:
        return "google"
    if "phone" in sign_in or claims.get("phone_number"):
        return "phone"
    return "unknown"


async def get_current_claims(authorization: Optional[str] = Header(None)) -> dict:
    """Strip `Bearer ` and verify the Firebase ID token. 401 on anything wrong."""
    if not authorization:
        raise HTTPException(status_code=401, detail="missing Authorization header")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=401, detail="missing or malformed Authorization header")
    return verify_token(parts[1].strip())


async def get_current_user(claims: dict = Depends(get_current_claims)) -> User:
    """Load the user by UID, upserting (and creating their one Merchant) on first sight."""
    db = get_db()
    uid = claims["uid"]
    now = datetime.utcnow()

    doc = await db.users.find_one({"uid": uid})
    if doc is not None:
        await db.users.update_one({"uid": uid}, {"$set": {"last_seen_at": now}})
        doc["last_seen_at"] = now
        return User(**{k: v for k, v in doc.items() if k != "_id"})

    # First sight: create the user's single merchant, then the user row.
    merchant_id = f"u_{uuid.uuid4().hex[:10]}"
    name = claims.get("name") or claims.get("email") or "New Merchant"
    await db.merchants.insert_one({
        "id": merchant_id,
        "name": name,
        "business_type": "vendor",
        "is_anchor": False,
        "created_at": now,
    })

    user = User(
        uid=uid,
        provider=_provider_from_claims(claims),
        email=claims.get("email"),
        phone=claims.get("phone_number"),
        name=claims.get("name"),
        photo_url=claims.get("picture"),
        merchant_id=merchant_id,
        kyc_status="unverified",
        created_at=now,
        last_seen_at=now,
    )
    await db.users.insert_one(user.model_dump())
    return user


async def require_kyc(user: User = Depends(get_current_user)) -> User:
    """Gate self-scoped writes: 403 unless the user has passed KYC."""
    if user.kyc_status != "verified":
        raise HTTPException(
            status_code=403,
            detail={"error": "kyc_required", "kyc_status": user.kyc_status},
        )
    return user
