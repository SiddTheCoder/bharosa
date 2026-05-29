"""Socket.IO live channel — pushes updated passports to connected clients."""
import logging

import socketio

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


@sio.event
async def connect(sid, environ):
    logger.info("socket connected: %s", sid)


@sio.event
async def disconnect(sid):
    logger.info("socket disconnected: %s", sid)


async def emit_passport(passport: dict) -> None:
    """Broadcast a passport update to all clients."""
    await sio.emit("passport-updated", passport)
