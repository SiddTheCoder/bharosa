"""T8 — Nepali voice I/O.

Speech-to-text and text-to-speech for the psychometric interview. Primary
path is ElevenLabs (Scribe STT + multilingual TTS); when no key is configured
or a call fails, TTS degrades to Microsoft Edge's free `ne-NP` neural voice so
the demo never goes silent. STT has no free fallback — it raises if unavailable.
"""
from __future__ import annotations

import logging

import httpx

from app.config import settings
from app.llm.keys import get_next_key

logger = logging.getLogger(__name__)

_ELEVEN_BASE = "https://api.elevenlabs.io/v1"
_STT_MODEL = "scribe_v1"
_TTS_MODEL = "eleven_multilingual_v2"
# A widely-available multilingual ElevenLabs voice (Rachel).
_TTS_VOICE = "21m00Tcm4TlvDq8ikWAM"

# Groq Whisper (free STT fallback). Whisper large-v3 covers Nepali (ne).
_GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
_GROQ_STT_MODEL = "whisper-large-v3"

# Edge TTS Nepali neural voice (fallback).
_EDGE_VOICE = "ne-NP-SagarNeural"


_MIME_EXT = {
    "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3",
    "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav",
    "audio/mp4": "m4a", "audio/m4a": "m4a", "audio/flac": "flac",
}


def _filename_for(mime: str) -> str:
    return f"audio.{_MIME_EXT.get(mime, 'webm')}"


def is_elevenlabs_available() -> bool:
    return bool(settings.ELEVENLABS_API_KEY)


async def stt_nepali(audio_bytes: bytes, mime: str = "audio/webm") -> str:
    """Transcribe Nepali audio. ElevenLabs Scribe first, Groq Whisper fallback."""
    if is_elevenlabs_available():
        try:
            return await _stt_elevenlabs(audio_bytes, mime)
        except Exception as e:  # boundary: out of credits / down → try Groq
            logger.warning("ElevenLabs STT failed, falling back to Groq Whisper: %s", e)

    return await _stt_groq(audio_bytes, mime)


async def _stt_elevenlabs(audio_bytes: bytes, mime: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{_ELEVEN_BASE}/speech-to-text",
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            data={"model_id": _STT_MODEL, "language_code": "ne"},
            files={"file": (_filename_for(mime), audio_bytes, mime)},
        )
    resp.raise_for_status()
    return (resp.json().get("text") or "").strip()


async def _stt_groq(audio_bytes: bytes, mime: str) -> str:
    key = get_next_key("groq")
    if not key:
        raise RuntimeError("no STT provider available (ElevenLabs + Groq both unavailable)")

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            _GROQ_STT_URL,
            headers={"Authorization": f"Bearer {key}"},
            data={"model": _GROQ_STT_MODEL, "language": "ne", "response_format": "json"},
            files={"file": (_filename_for(mime), audio_bytes, mime)},
        )
    resp.raise_for_status()
    return (resp.json().get("text") or "").strip()


async def tts_nepali(text: str) -> tuple[bytes, str]:
    """Synthesize Nepali speech. Returns (audio_bytes, provider)."""
    if is_elevenlabs_available():
        try:
            return await _tts_elevenlabs(text), "elevenlabs"
        except Exception as e:  # boundary: keep the demo audible on any failure
            logger.warning("ElevenLabs TTS failed, falling back to edge: %s", e)
    return await _tts_edge(text), "edge"


async def _tts_elevenlabs(text: str) -> bytes:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{_ELEVEN_BASE}/text-to-speech/{_TTS_VOICE}",
            headers={
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "accept": "audio/mpeg",
                "content-type": "application/json",
            },
            json={"text": text, "model_id": _TTS_MODEL},
        )
    resp.raise_for_status()
    return resp.content


async def _tts_edge(text: str) -> bytes:
    try:
        import edge_tts
    except ImportError as e:
        raise RuntimeError(
            "edge-tts not installed and ElevenLabs unavailable — no TTS path"
        ) from e

    chunks = bytearray()
    communicate = edge_tts.Communicate(text, _EDGE_VOICE)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.extend(chunk["data"])
    return bytes(chunks)
