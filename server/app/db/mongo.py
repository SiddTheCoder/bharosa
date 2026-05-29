"""MongoDB connection (Motor, async)."""
import logging
from typing import Optional

from motor.motor_asyncio import (
    AsyncIOMotorClient,
    AsyncIOMotorDatabase,
    AsyncIOMotorGridFSBucket,
)

from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def connect_to_mongo() -> AsyncIOMotorDatabase:
    """Open the Motor client and cache the bharosa database handle."""
    global _client, _db
    if _db is not None:
        return _db
    _client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
    _db = _client[settings.MONGO_DB]
    try:
        await _client.admin.command("ping")
        logger.info("MongoDB connected: %s/%s", settings.MONGO_URI, settings.MONGO_DB)
    except Exception as e:  # boundary: external service may be down
        logger.warning("MongoDB ping failed (continuing): %s", e)
    return _db


async def close_mongo() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
    _client, _db = None, None


def get_db() -> AsyncIOMotorDatabase:
    """Return the cached database. Call connect_to_mongo() first (lifespan does)."""
    if _db is None:
        raise RuntimeError("MongoDB is not connected. Call connect_to_mongo() first.")
    return _db


def get_gridfs_bucket(name: str = "kyc") -> AsyncIOMotorGridFSBucket:
    """GridFS bucket for binary blobs (KYC documents/selfies). Private to the DB."""
    return AsyncIOMotorGridFSBucket(get_db(), bucket_name=name)
