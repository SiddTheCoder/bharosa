"""Firebase Admin — verify client ID tokens server-side.

The client sends a Firebase ID token; we trust only the UID this verifies to.
The service-account credential comes from `FIREBASE_CREDENTIALS_JSON` (either an
inline JSON string or a path to the JSON file). If no credential is configured
the server still boots — `init_firebase()` logs a warning and `verify_token`
returns 503 so the rest of the app (engine, demo) keeps working.
"""
from __future__ import annotations

import json
import logging
import os

import firebase_admin
from fastapi import HTTPException
from firebase_admin import auth as fb_auth
from firebase_admin import credentials

from app.config import settings

logger = logging.getLogger(__name__)

_app: firebase_admin.App | None = None


def _load_credential() -> credentials.Base | None:
    raw = settings.FIREBASE_CREDENTIALS_JSON.strip()
    if not raw:
        return None
    # Inline JSON object?
    if raw.startswith("{"):
        return credentials.Certificate(json.loads(raw))
    # Otherwise treat as a path to the service-account file.
    if os.path.isfile(raw):
        return credentials.Certificate(raw)
    logger.warning("FIREBASE_CREDENTIALS_JSON is neither inline JSON nor a file path: %r", raw[:32])
    return None


def init_firebase() -> None:
    """Initialize the Firebase Admin app once (called from lifespan). No-op if unconfigured."""
    global _app
    if _app is not None:
        return
    cred = _load_credential()
    if cred is None:
        logger.warning("🔥 Firebase Admin NOT configured (set FIREBASE_CREDENTIALS_JSON). "
                       "Auth endpoints will return 503.")
        return
    options = {"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None
    _app = firebase_admin.initialize_app(cred, options)
    logger.info("🔥 Firebase Admin initialized (project=%s)", settings.FIREBASE_PROJECT_ID or "?")


def is_ready() -> bool:
    return _app is not None


def verify_token(id_token: str) -> dict:
    """Verify a Firebase ID token; return its decoded claims. 401 on any failure."""
    if _app is None:
        raise HTTPException(status_code=503, detail="auth not configured on server")
    try:
        return fb_auth.verify_id_token(id_token, app=_app)
    except Exception as e:  # boundary: invalid/expired/forged token
        logger.info("token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="invalid or expired token")
