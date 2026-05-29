"""In-memory API-key store — env-only, no registry, no per-user keys.

Keys are read once (from the loaded `.env` via `settings`, falling back to the
process environment) into a module-level dict and rotated round-robin from
memory. A provider may hold one key or a JSON array of keys, e.g.
`GROQ_API_KEY=["gsk_a","gsk_b"]`. Call `load_keys()` at server start; access is
also lazy so tests and scripts work without explicit init.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# Provider name → environment variable.
PROVIDER_ENV_MAP: dict[str, str] = {
    "groq": "GROQ_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "cerebras": "CEREBRAS_API_KEY",
    "sambanova": "SAMBANOVA_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "cohere": "COHERE_API_KEY",
}

_keys: dict[str, list[str]] = {}
_rotation: dict[str, int] = {}
_loaded: bool = False


def _resolve_env(provider_or_env: str) -> str:
    lower = provider_or_env.strip().lower()
    if lower in PROVIDER_ENV_MAP:
        return PROVIDER_ENV_MAP[lower]
    upper = provider_or_env.strip().upper()
    if upper.endswith("_API_KEY"):
        return upper
    raise ValueError(f"Unknown provider/env key: {provider_or_env!r}")


def _parse(raw: Optional[str]) -> list[str]:
    """Parse a raw env value into a list of keys (JSON array or single key)."""
    if not raw or not raw.strip():
        return []
    raw = raw.strip()
    if raw.startswith("[") and raw.endswith("]"):
        for candidate in (raw, raw.replace("'", '"')):
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, list):
                    return [str(k).strip() for k in parsed if str(k).strip()]
            except json.JSONDecodeError:
                pass
        inner = raw[1:-1].strip()
        return [p.strip().strip("'\"") for p in inner.split(",") if p.strip()]
    return [raw]


def _raw_for(env_name: str) -> Optional[str]:
    """Env value: prefer settings (guaranteed to have loaded .env), else os.environ."""
    val = getattr(settings, env_name, None)
    if val:
        return str(val)
    return os.getenv(env_name)


def load_keys() -> dict[str, int]:
    """Read every provider's key(s) from env into memory. Idempotent."""
    global _loaded
    _keys.clear()
    _rotation.clear()
    for env_name in PROVIDER_ENV_MAP.values():
        parsed = _parse(_raw_for(env_name))
        _keys[env_name] = parsed
        _rotation[env_name] = 0
    _loaded = True
    counts = {e: len(v) for e, v in _keys.items() if v}
    logger.info("🔑 Loaded API keys from env: %s", counts or "none")
    return counts


def _ensure_loaded() -> None:
    if not _loaded:
        load_keys()


def get_all_keys(provider_or_env: str) -> list[str]:
    _ensure_loaded()
    return list(_keys.get(_resolve_env(provider_or_env), []))


def get_next_key(provider_or_env: str) -> Optional[str]:
    """Return the next key in round-robin rotation, or None if none configured."""
    _ensure_loaded()
    env_name = _resolve_env(provider_or_env)
    keys = _keys.get(env_name, [])
    if not keys:
        return None
    idx = _rotation.get(env_name, 0) % len(keys)
    _rotation[env_name] = (idx + 1) % len(keys)
    return keys[idx]


def rotate_key(provider_or_env: str) -> Optional[str]:
    """Advance the rotation pointer and return the new current key."""
    _ensure_loaded()
    env_name = _resolve_env(provider_or_env)
    keys = _keys.get(env_name, [])
    if not keys:
        return None
    _rotation[env_name] = (_rotation.get(env_name, 0) + 1) % len(keys)
    return keys[_rotation[env_name]]


def get_key_status(provider_or_env: str) -> dict:
    _ensure_loaded()
    env_name = _resolve_env(provider_or_env)
    keys = _keys.get(env_name, [])
    return {
        "env_name": env_name,
        "key_count": len(keys),
        "current_index": _rotation.get(env_name, 0),
        "has_keys": bool(keys),
    }
