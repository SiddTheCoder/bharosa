"""Bharosa FastAPI application."""
import logging
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import events, interview, passport
from app.db.mongo import connect_to_mongo, close_mongo
from app.live.socket import sio
from app.llm.keys import load_keys

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_keys()              # read API keys from env into the in-memory store
    await connect_to_mongo()
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

# Combined ASGI app: Socket.IO live channel wrapping the FastAPI app.
asgi_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")
