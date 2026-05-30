"""Passport + explain read endpoints, plus vouching for another merchant."""
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.deps import require_kyc
from app.db.mongo import get_db
from app.engines.explainer import explain
from app.live.socket import emit_passport
from app.models.schemas import User
from app.services.passport_service import build_passport

router = APIRouter()


@router.get("/merchant/{merchant_id}/passport")
async def get_passport(merchant_id: str):
    return await build_passport(merchant_id)


@router.get("/merchant/{merchant_id}/explain")
async def get_explain(merchant_id: str):
    return await explain(merchant_id)


class VouchIn(BaseModel):
    kind: Literal["vouch", "guarantee"] = "vouch"


@router.post("/merchant/{merchant_id}/vouch")
async def vouch_for_merchant(
    merchant_id: str,
    body: VouchIn,
    voucher: User = Depends(require_kyc),
):
    """Record that the verified caller vouches for `merchant_id`.

    Unlike `/me/event` (which always credits the caller's *own* merchant), this
    points the edge the right way: from the voucher to the target. Trust then
    flows along it on the next passport rebuild. Self-vouches and duplicates are
    rejected so the social graph stays honest.
    """
    if merchant_id == voucher.merchant_id:
        raise HTTPException(status_code=400, detail="you cannot vouch for yourself")

    db = get_db()
    target = await db.merchants.find_one({"id": merchant_id})
    if target is None:
        raise HTTPException(status_code=404, detail="merchant not found")

    existing = await db.vouches.find_one(
        {"from_id": voucher.merchant_id, "to_id": merchant_id}
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="you have already vouched for this merchant")

    await db.vouches.insert_one({
        "id": f"v_{uuid.uuid4().hex[:8]}",
        "from_id": voucher.merchant_id,
        "to_id": merchant_id,
        "kind": body.kind,
        "created_at": datetime.utcnow(),
    })

    passport = await build_passport(merchant_id)
    await emit_passport(passport)
    return passport
