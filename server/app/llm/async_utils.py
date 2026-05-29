"""Minimal async retry helper used by the LLM manager/router."""
import asyncio
import logging
from typing import Any, Callable, Coroutine, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


async def with_retry(
    coro_factory: Callable[[], Coroutine[Any, Any, T]],
    *,
    attempts: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 2.0,
    name: str = "op",
    retry_on: tuple[type, ...] = (Exception,),
    do_not_retry_on: tuple[type, ...] = (),
) -> T:
    """Run an async op up to ``attempts`` times with exponential backoff.

    The factory is invoked fresh on every attempt — a coroutine object can
    only be awaited once.
    """
    last_exc: BaseException | None = None
    for attempt in range(1, attempts + 1):
        try:
            return await coro_factory()
        except do_not_retry_on as e:
            logger.warning("%s: non-retryable error on attempt %d: %s", name, attempt, e)
            raise
        except retry_on as e:
            last_exc = e
            if attempt >= attempts:
                logger.error("%s: failed after %d attempts: %s", name, attempts, e)
                break
            delay = min(max_delay, base_delay * (2 ** (attempt - 1)))
            logger.warning(
                "%s: attempt %d/%d failed (%s); retrying in %.0fms",
                name, attempt, attempts, e, delay * 1000,
            )
            await asyncio.sleep(delay)
    assert last_exc is not None
    raise last_exc
