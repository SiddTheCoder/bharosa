"""T7 — API + live channel acceptance.

Covers: passport read for an invisible merchant, score lift after an on-time
bill via POST /event, and the Socket.IO `passport-updated` broadcast firing.
"""
import uuid

import httpx
import pytest

from app.live import socket as live_socket
from app.main import app


def _client() -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


async def test_health():
    async with _client() as c:
        r = await c.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


async def test_invisible_merchant_passport():
    mid = f"ghost_{uuid.uuid4().hex[:8]}"
    async with _client() as c:
        r = await c.get(f"/merchant/{mid}/passport")
    assert r.status_code == 200
    body = r.json()
    assert body["merchant_id"] == mid
    assert 300 <= body["score"] <= 850
    # No evidence yet → leans on the weak prior, so confidence stays low.
    assert body["confidence"] < 60
    assert "why" in body and "next_steps" in body


async def test_event_raises_score_and_emits(monkeypatch):
    emitted: list[tuple[str, dict]] = []

    async def _capture(event, data=None, *a, **k):
        emitted.append((event, data))

    monkeypatch.setattr(live_socket.sio, "emit", _capture)

    mid = f"riser_{uuid.uuid4().hex[:8]}"
    async with _client() as c:
        before = (await c.get(f"/merchant/{mid}/passport")).json()
        for _ in range(6):
            r = await c.post("/event", json={
                "merchant_id": mid, "kind": "electricity",
                "amount": 1500, "on_time": True,
            })
            assert r.status_code == 200
        after = r.json()

    assert after["score"] > before["score"]
    assert any(ev == "passport-updated" for ev, _ in emitted)
    assert emitted[-1][1]["merchant_id"] == mid
