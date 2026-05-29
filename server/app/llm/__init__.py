"""
AI Providers Package

Public API for LLM interactions with intelligent use-case routing.

Usage:
    from app.llm import routed_chat, routed_stream

    # Route by use-case (recommended)
    response, provider = await routed_chat("streaming", messages)
    async for chunk in routed_stream("streaming", messages):
        print(chunk)

    # Legacy flat fallback (still works)
    response, provider = await llm_chat(messages)
    async for chunk in llm_stream(messages):
        print(chunk)
"""

from app.llm.base_client import BaseClient, QuotaError, AllKeysExhaustedError
from app.llm.manager import (
    LLMManager,
    AllProvidersExhaustedError,
    llm_chat,
    llm_stream,
    get_llm_manager,
)
from app.llm.router import (
    IntelligentRouter,
    routed_chat,
    routed_stream,
    get_router,
)
from app.llm.routing_config import (
    USE_CASE_STREAMING,
    USE_CASE_REASONING,
    USE_CASE_LIGHTWEIGHT,
    USE_CASE_CONTENT,
    USE_CASE_SUMMARIZE,
    ROUTING_TABLE,
)
from app.llm.keys import (
    load_keys,
    get_next_key,
    rotate_key,
    get_all_keys,
    get_key_status,
)

__all__ = [
    # Intelligent router (new — preferred)
    "routed_chat",
    "routed_stream",
    "IntelligentRouter",
    "get_router",
    # Use-case constants
    "USE_CASE_STREAMING",
    "USE_CASE_REASONING",
    "USE_CASE_LIGHTWEIGHT",
    "USE_CASE_CONTENT",
    "USE_CASE_SUMMARIZE",
    "ROUTING_TABLE",
    # Legacy flat fallback (still works)
    "llm_chat",
    "llm_stream",
    "LLMManager",
    "get_llm_manager",
    # Key management (env-only, in-memory)
    "load_keys",
    "get_next_key",
    "rotate_key",
    "get_all_keys",
    "get_key_status",
    # Exceptions
    "QuotaError",
    "AllKeysExhaustedError",
    "AllProvidersExhaustedError",
    # Base class (for extending)
    "BaseClient",
]
