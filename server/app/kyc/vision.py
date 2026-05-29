"""Multimodal vision calls for KYC, via Gemini directly.

The shared LLM router (`app/llm`) is text-only, so KYC talks to Gemini's vision
model itself — reusing the env-only key store for rotation. Every call returns
strict JSON parsed defensively (same pattern as `interview/scoring.py`); on any
failure we return `None` so the pipeline can degrade to a low-confidence
`pending` rather than crash.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Optional

import google.generativeai as genai

from app.llm.keys import get_next_key, rotate_key

logger = logging.getLogger(__name__)

VISION_MODEL = "gemini-2.5-flash"


def vision_available() -> bool:
    return get_next_key("gemini") is not None


def _parse_json(text: str) -> Optional[dict]:
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _image_part(image: bytes, mime: str = "image/jpeg") -> dict:
    return {"mime_type": mime, "data": image}


async def vision_json(
    prompt: str,
    images: list[tuple[bytes, str]],
    *,
    retries: int = 2,
) -> Optional[dict]:
    """Send a prompt + one or more images to the vision model; return parsed JSON or None.

    `images` is a list of (bytes, mime) tuples. Rotates Gemini keys across retries.
    """
    parts: list = [prompt] + [_image_part(b, m) for b, m in images]

    def _call(api_key: str) -> str:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(VISION_MODEL)
        resp = model.generate_content(
            parts,
            generation_config={"temperature": 0.1, "max_output_tokens": 2048},
        )
        return str(resp.text or "")

    for attempt in range(max(1, retries)):
        key = get_next_key("gemini")
        if not key:
            logger.warning("KYC vision: no Gemini key configured")
            return None
        try:
            text = await asyncio.to_thread(_call, key)
            data = _parse_json(text)
            if data is not None:
                return data
            logger.info("KYC vision: unparseable response (attempt %d)", attempt + 1)
        except Exception as e:  # boundary: model/network/quota
            logger.warning("KYC vision call failed (attempt %d): %s", attempt + 1, e)
            rotate_key("gemini")

    return None
