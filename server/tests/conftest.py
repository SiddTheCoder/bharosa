import pytest

from app.db.mongo import connect_to_mongo, close_mongo


@pytest.fixture(autouse=True)
async def _db():
    """Fresh Mongo connection bound to each test's event loop (Motor needs this)."""
    await close_mongo()
    await connect_to_mongo()
    yield
    await close_mongo()
