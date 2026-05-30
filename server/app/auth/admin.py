"""Admin auth — credential login + signed admin JWT.

The web admin panel signs in with the single operator credential from config
(`ADMIN_EMAIL` / `ADMIN_PASSWORD`) and receives an HS256 JWT signed with
`ADMIN_JWT_SECRET`. Admin routes verify that token via `get_current_admin`.

This is deliberately separate from the merchant (Firebase) auth in
`app/auth/deps.py`: a different secret/verifier means admin and merchant tokens
can never cross-validate. One is for the admin web panel, the other for the
merchant mobile app.
"""
from __future__ import annotations

import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Header, HTTPException

from app.config import settings

ALGORITHM = "HS256"


def check_credentials(email: str, password: str) -> bool:
    """Constant-time compare against the configured single admin credential."""
    email_ok = hmac.compare_digest((email or "").strip().lower(), settings.ADMIN_EMAIL.lower())
    pw_ok = hmac.compare_digest(password or "", settings.ADMIN_PASSWORD)
    return email_ok and pw_ok


def create_admin_token(email: str) -> str:
    """Issue an admin JWT: {sub: email, role: "admin", exp}."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email,
        "role": "admin",
        "iat": now,
        "exp": now + timedelta(hours=settings.ADMIN_TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, settings.ADMIN_JWT_SECRET, algorithm=ALGORITHM)


def verify_admin_token(token: str) -> dict:
    """Decode + validate an admin JWT. 401 on any failure or non-admin role."""
    try:
        claims = jwt.decode(token, settings.ADMIN_JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="invalid or expired admin token")
    if claims.get("role") != "admin":
        raise HTTPException(status_code=401, detail="not an admin token")
    return claims


async def get_current_admin(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency: strip `Bearer `, verify, return {"email": ...}."""
    if not authorization:
        raise HTTPException(status_code=401, detail="missing Authorization header")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=401, detail="missing or malformed Authorization header")
    claims = verify_admin_token(parts[1].strip())
    return {"email": claims.get("sub")}
