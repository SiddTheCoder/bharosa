"""Admin panel API — operator login + read access to every merchant + KYC review.

Auth: a single config operator (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) logs in via
`POST /admin/login` and gets an admin JWT (see `app/auth/admin.py`). Every other
route here depends on `get_current_admin`. This namespace is fully separate from
the merchant (Firebase) routes — the web admin panel is the only client.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from app.auth.admin import check_credentials, create_admin_token, get_current_admin
from app.db.mongo import get_db, get_gridfs_bucket
from app.engines.fusion_engine import compute_trust, posterior_stats
from app.services.passport_service import build_passport

router = APIRouter(prefix="/admin")

TXN_KINDS = ("electricity", "water", "internet", "airtime", "qr_revenue", "supplier_payment")


def _iso(dt) -> Optional[str]:
    return dt.isoformat() if isinstance(dt, datetime) else None


# ───────────────────────────── auth ─────────────────────────────

class LoginIn(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(body: LoginIn):
    if not check_credentials(body.email, body.password):
        raise HTTPException(status_code=401, detail="invalid email or password")
    email = body.email.strip().lower()
    return {"token": create_admin_token(email), "admin": {"email": email}}


@router.get("/me")
async def me(admin: dict = Depends(get_current_admin)):
    return {"admin": admin}


# ─────────────────────────── score helper ───────────────────────────

async def _score_summary(db, merchant_id: str, refresh: bool = False) -> dict:
    """Score/confidence/fraud_risk for a merchant.

    Reads the persisted Beta posterior from `trust_states` when available; computes
    (and persists) it via the fusion engine on first sight or when `refresh` is set.
    `fraud_risk` is cached on the trust_states doc so the list stays cheap.
    """
    state = await db.trust_states.find_one({"merchant_id": merchant_id})
    if state is None or refresh or "fraud_risk" not in state:
        res = await compute_trust(merchant_id)            # persists alpha/beta
        await db.trust_states.update_one(
            {"merchant_id": merchant_id},
            {"$set": {"fraud_risk": res["fraud_risk"]}},
        )
        return {"score": res["score"], "confidence": res["confidence"], "fraud_risk": res["fraud_risk"]}
    stats = posterior_stats(float(state["alpha"]), float(state["beta"]))
    return {"score": stats["score"], "confidence": stats["confidence"],
            "fraud_risk": state.get("fraud_risk", "LOW")}


# ───────────────────────────── merchants ─────────────────────────────

@router.get("/merchants")
async def list_merchants(
    q: str = Query("", description="search by merchant name or id"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    refresh: bool = Query(False, description="force recompute of scores"),
    admin: dict = Depends(get_current_admin),
):
    db = get_db()
    flt: dict = {}
    if q.strip():
        flt = {"$or": [
            {"name": {"$regex": q.strip(), "$options": "i"}},
            {"id": {"$regex": q.strip(), "$options": "i"}},
        ]}

    total = await db.merchants.count_documents(flt)
    cursor = db.merchants.find(flt).sort([("is_anchor", -1), ("name", 1)]).skip(skip).limit(limit)
    merchants = await cursor.to_list(length=limit)

    # Batch the user join so kyc_status is one query, not N.
    ids = [m["id"] for m in merchants]
    users = await db.users.find({"merchant_id": {"$in": ids}}).to_list(length=None)
    kyc_by_merchant = {u["merchant_id"]: u.get("kyc_status") for u in users}

    items = []
    for m in merchants:
        summary = await _score_summary(db, m["id"], refresh=refresh)
        items.append({
            "id": m["id"],
            "name": m.get("name"),
            "business_type": m.get("business_type"),
            "is_anchor": m.get("is_anchor", False),
            "created_at": _iso(m.get("created_at")),
            "kyc_status": kyc_by_merchant.get(m["id"]),
            **summary,
        })
    return {"merchants": items, "total": total, "skip": skip, "limit": limit}


@router.get("/merchants/{merchant_id}")
async def merchant_detail(merchant_id: str, admin: dict = Depends(get_current_admin)):
    db = get_db()
    m = await db.merchants.find_one({"id": merchant_id})
    if m is None:
        raise HTTPException(status_code=404, detail="merchant not found")

    passport = await build_passport(merchant_id)
    passport["merchant_name"] = m.get("name")        # engine result has no name

    user = await db.users.find_one({"merchant_id": merchant_id})
    kyc = None
    if user is not None:
        kyc = await db.kyc_submissions.find_one({"uid": user["uid"]}, sort=[("created_at", -1)])

    n_txn = await db.behavior_events.count_documents({"merchant_id": merchant_id})
    n_vouch_in = await db.vouches.count_documents({"to_id": merchant_id})
    n_vouch_out = await db.vouches.count_documents({"from_id": merchant_id})

    return {
        "merchant": {
            "id": m["id"],
            "name": m.get("name"),
            "business_type": m.get("business_type"),
            "is_anchor": m.get("is_anchor", False),
            "created_at": _iso(m.get("created_at")),
        },
        "passport": passport,
        "user": _public_user(user) if user else None,
        "kyc": _public_kyc(kyc) if kyc else None,
        "counts": {"transactions": n_txn, "vouches_in": n_vouch_in, "vouches_out": n_vouch_out},
    }


@router.get("/merchants/{merchant_id}/transactions")
async def merchant_transactions(
    merchant_id: str,
    kind: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: dict = Depends(get_current_admin),
):
    db = get_db()
    flt: dict = {"merchant_id": merchant_id}
    if kind:
        flt["kind"] = kind
    total = await db.behavior_events.count_documents(flt)
    cursor = db.behavior_events.find(flt).sort("date", -1).skip(skip).limit(limit)
    events = await cursor.to_list(length=limit)
    transactions = [{
        "id": e.get("id"),
        "kind": e.get("kind"),
        "amount": e.get("amount"),
        "on_time": e.get("on_time"),
        "direction": e.get("direction"),
        "counterparty_name": e.get("counterparty_name"),
        "date": _iso(e.get("date")),
        "receipt_uri": e.get("receipt_uri"),
    } for e in events]

    # Vouch edges touching this merchant, with counterparty names resolved.
    vouch_docs = await db.vouches.find(
        {"$or": [{"to_id": merchant_id}, {"from_id": merchant_id}]}
    ).sort("created_at", -1).to_list(length=None)
    other_ids = {v["from_id"] for v in vouch_docs} | {v["to_id"] for v in vouch_docs}
    name_map = {
        d["id"]: d.get("name")
        for d in await db.merchants.find({"id": {"$in": list(other_ids)}}).to_list(length=None)
    }
    vouches = [{
        "id": v.get("id"),
        "kind": v.get("kind"),
        "direction": "in" if v.get("to_id") == merchant_id else "out",
        "from_id": v.get("from_id"),
        "from_name": name_map.get(v.get("from_id")),
        "to_id": v.get("to_id"),
        "to_name": name_map.get(v.get("to_id")),
        "created_at": _iso(v.get("created_at")),
    } for v in vouch_docs]

    return {"transactions": transactions, "total": total, "skip": skip, "limit": limit,
            "vouches": vouches}


# ───────────────────────────── KYC review ─────────────────────────────

def _public_user(u: dict) -> dict:
    return {
        "uid": u.get("uid"),
        "name": u.get("name"),
        "email": u.get("email"),
        "phone": u.get("phone"),
        "provider": u.get("provider"),
        "kyc_status": u.get("kyc_status"),
        "created_at": _iso(u.get("created_at")),
    }


def _public_kyc(k: dict) -> dict:
    return {
        "submission_id": k.get("id"),
        "doc_type": k.get("doc_type"),
        "decision": k.get("decision"),
        "confidence": k.get("confidence"),
        "reasons": k.get("reasons", []),
        "claimed": k.get("claimed", {}),
        "extracted": k.get("extracted", {}),
        "checks": k.get("checks", {}),
        "doc_uris": k.get("doc_uris", []),
        "selfie_uri": k.get("selfie_uri"),
        "created_at": _iso(k.get("created_at")),
    }


@router.get("/merchants/{merchant_id}/kyc")
async def merchant_kyc(merchant_id: str, admin: dict = Depends(get_current_admin)):
    db = get_db()
    user = await db.users.find_one({"merchant_id": merchant_id})
    if user is None:
        return {"user": None, "submissions": []}
    subs = await db.kyc_submissions.find({"uid": user["uid"]}).sort("created_at", -1).to_list(length=None)
    return {"user": _public_user(user), "submissions": [_public_kyc(s) for s in subs]}


class KycDecisionIn(BaseModel):
    decision: Literal["verified", "rejected"]
    reason: Optional[str] = None


@router.post("/merchants/{merchant_id}/kyc/{submission_id}/decision")
async def decide_kyc(
    merchant_id: str,
    submission_id: str,
    body: KycDecisionIn,
    admin: dict = Depends(get_current_admin),
):
    db = get_db()
    user = await db.users.find_one({"merchant_id": merchant_id})
    if user is None:
        raise HTTPException(status_code=404, detail="merchant has no linked user")
    sub = await db.kyc_submissions.find_one({"id": submission_id, "uid": user["uid"]})
    if sub is None:
        raise HTTPException(status_code=404, detail="kyc submission not found")

    reasons = list(sub.get("reasons", []))
    note = f"admin {body.decision} ({admin['email']})" + (f": {body.reason}" if body.reason else "")
    reasons.append(note)

    await db.kyc_submissions.update_one(
        {"id": submission_id},
        {"$set": {"decision": body.decision, "reasons": reasons}},
    )
    await db.users.update_one(
        {"uid": user["uid"]}, {"$set": {"kyc_status": body.decision}}
    )
    return {"submission_id": submission_id, "decision": body.decision, "kyc_status": body.decision}


# ───────────────────────────── files + stats ─────────────────────────────

@router.get("/file/{file_id}")
async def get_file(file_id: str, admin: dict = Depends(get_current_admin)):
    """Stream any stored file (KYC doc/selfie, bill receipt). Admin sees all — no uid scope."""
    try:
        oid = ObjectId(file_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="invalid file id")
    bucket = get_gridfs_bucket()
    try:
        stream = await bucket.open_download_stream(oid)
    except Exception:
        raise HTTPException(status_code=404, detail="file not found")
    data = await stream.read()
    return Response(content=data, media_type=(stream.metadata or {}).get("mime", "image/jpeg"))


@router.get("/stats")
async def stats(admin: dict = Depends(get_current_admin)):
    db = get_db()
    total_merchants = await db.merchants.count_documents({})
    anchors = await db.merchants.count_documents({"is_anchor": True})
    fraud_flagged = await db.trust_states.count_documents({"fraud_risk": "HIGH"})
    pending_kyc = await db.users.count_documents({"kyc_status": "pending"})

    states = await db.trust_states.find({}, {"alpha": 1, "beta": 1}).to_list(length=None)
    scores = [posterior_stats(float(s["alpha"]), float(s["beta"]))["score"]
              for s in states if s.get("alpha") and s.get("beta")]
    avg_score = round(sum(scores) / len(scores)) if scores else 0

    return {
        "total_merchants": total_merchants,
        "anchors": anchors,
        "fraud_flagged": fraud_flagged,
        "pending_kyc": pending_kyc,
        "avg_score": avg_score,
        "scored": len(scores),
    }
