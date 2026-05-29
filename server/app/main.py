"""Bharosa FastAPI application."""
import logging
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, events, interview, kyc, me, passport
from app.auth.firebase import init_firebase
from app.db.mongo import connect_to_mongo, close_mongo
from app.live.socket import sio
from app.llm.keys import load_keys

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_keys()              # read API keys from env into the in-memory store
    init_firebase()          # verify client ID tokens server-side (no-op if unconfigured)
    db = await connect_to_mongo()
    try:
        await db.users.create_index("uid", unique=True)
        await db.kyc_submissions.create_index("uid")
    except Exception as e:   # boundary: index creation is best-effort
        logging.getLogger(__name__).warning("index creation skipped: %s", e)
    yield
    await close_mongo()


app = FastAPI(title="Bharosa Trust Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"ok": True}


app.include_router(passport.router)
app.include_router(events.router)
app.include_router(interview.router)
app.include_router(auth.router)
app.include_router(kyc.router)
app.include_router(me.router)

# Combined ASGI app: Socket.IO live channel wrapping the FastAPI app.
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")
