"""Event ingestion + demo controls. Each mutation re-emits the live passport."""
import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.db.mongo import get_db
from app.live.socket import emit_passport
from app.services.passport_service import build_passport

router = APIRouter()

BILL_KINDS = {"electricity", "water", "internet"}


class EventIn(BaseModel):
    merchant_id: str
    kind: Literal[
        "electricity", "water", "internet", "airtime", "qr_revenue",
        "vouch", "guarantee",
    ]
    amount: Optional[int] = None
    on_time: Optional[bool] = None
    from_id: Optional[str] = None          # voucher (for vouch/guarantee)


@router.post("/event")
async def post_event(ev: EventIn):
    db = get_db()
    now = datetime.utcnow()

    if ev.kind in ("vouch", "guarantee"):
        await db.vouches.insert_one({
            "id": f"v_{uuid.uuid4().hex[:8]}",
            "from_id": ev.from_id or "anchor_coop",
            "to_id": ev.merchant_id,
            "kind": ev.kind,
            "created_at": now,
        })
    else:
        doc = {
            "id": f"e_{uuid.uuid4().hex[:8]}",
            "merchant_id": ev.merchant_id,
            "kind": ev.kind,
            "date": now,
            "amount": ev.amount if ev.amount is not None else 1000,
            "on_time": ev.on_time if ev.kind in BILL_KINDS else None,
            "due_date": now if ev.kind in BILL_KINDS else None,
        }
        await db.behavior_events.insert_one(doc)

    passport = await build_passport(ev.merchant_id)
    await emit_passport(passport)
    return passport


class InjectIn(BaseModel):
    target_id: str = "sita_tea_shop"
    size: int = 4


@router.post("/demo/inject-fraud-ring")
async def inject_fraud_ring(body: InjectIn):
    """Plant a reciprocal fake-account ring that vouches the target (live fraud beat)."""
    db = get_db()
    now = datetime.utcnow()

    # Clear any previously injected ring so the beat is repeatable.
    await db.merchants.delete_many({"id": {"$regex": "^injected_"}})
    await db.vouches.delete_many({"$or": [
        {"from_id": {"$regex": "^injected_"}},
        {"to_id": {"$regex": "^injected_"}},
    ]})

    ring = [f"injected_{uuid.uuid4().hex[:6]}" for _ in range(max(3, body.size))]
    for i, mid in enumerate(ring):
        await db.merchants.insert_one({
            "id": mid,
            "name": f"Ghost {i+1}",
            "business_type": "vendor",
            "is_anchor": False,
            "created_at": now,
        })

    def _vouch(a, b, kind="vouch"):
        return {
            "id": f"v_{uuid.uuid4().hex[:8]}",
            "from_id": a, "to_id": b, "kind": kind, "created_at": now,
        }

    # Reciprocal cycle among fakes + all fakes vouch the target.
    edges = []
    for i in range(len(ring)):
        a, b = ring[i], ring[(i + 1) % len(ring)]
        edges += [_vouch(a, b), _vouch(b, a)]
    for a in ring:
        edges.append(_vouch(a, body.target_id, "guarantee"))
    await db.vouches.insert_many(edges)

    passport = await build_passport(body.target_id)
    await emit_passport(passport)
    return passport
