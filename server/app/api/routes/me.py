"""T23 — Self-scoped endpoints. Every action targets the caller's own merchant.

Reads (`GET /me/passport`) need only a logged-in user. Writes (events, interview
answers) additionally require a verified KYC status via `require_kyc`. The shared
`/merchant/{id}/...` and `/event` routes stay open for the lender/atlas view and
the seeded demo network.
"""
import base64
import re
import uuid
from datetime import datetime
from typing import Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.auth.deps import get_current_user, require_kyc
from app.db.mongo import get_db, get_gridfs_bucket
from app.interview.scoring import score_answer
from app.interview.state_machine import get_question
from app.interview.voice_elevenlabs import stt_nepali
from app.live.socket import emit_passport
from app.models.schemas import User
from app.services.passport_service import build_passport

router = APIRouter(prefix="/me")

BILL_KINDS = {"electricity", "water", "internet"}


@router.get("/passport")
async def my_passport(user: User = Depends(get_current_user)):
    return await build_passport(user.merchant_id)


COMMERCE_KINDS = {"qr_revenue", "supplier_payment"}


def _slug(text: str) -> str:
    """Stable counterparty token from a display name, so repeat payments group."""
    return re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_") or "unknown"


class MeEventIn(BaseModel):
    kind: Literal[
        "electricity", "water", "internet", "airtime", "qr_revenue",
        "supplier_payment", "vouch", "guarantee",
    ]
    amount: Optional[int] = None
    on_time: Optional[bool] = None
    from_id: Optional[str] = None          # voucher (for vouch/guarantee)
    # Commerce-relationship fields (qr_revenue = customer paid; supplier_payment = paid supplier)
    counterparty: Optional[str] = None
    counterparty_name: Optional[str] = None
    direction: Optional[Literal["in", "out"]] = None


@router.post("/event")
async def my_event(ev: MeEventIn, user: User = Depends(require_kyc)):
    db = get_db()
    now = datetime.utcnow()
    merchant_id = user.merchant_id

    if ev.kind in ("vouch", "guarantee"):
        await db.vouches.insert_one({
            "id": f"v_{uuid.uuid4().hex[:8]}",
            "from_id": ev.from_id or "anchor_coop",
            "to_id": merchant_id,
            "kind": ev.kind,
            "created_at": now,
        })
    else:
        doc = {
            "id": f"e_{uuid.uuid4().hex[:8]}",
            "merchant_id": merchant_id,
            "kind": ev.kind,
            "date": now,
            "amount": ev.amount if ev.amount is not None else 1000,
            "on_time": ev.on_time if ev.kind in BILL_KINDS else None,
            "due_date": now if ev.kind in BILL_KINDS else None,
        }
        if ev.kind in COMMERCE_KINDS:
            # Tag the counterparty so supplier/customer-regularity detection can group it.
            direction = ev.direction or ("out" if ev.kind == "supplier_payment" else "in")
            name = (ev.counterparty_name or "").strip()
            counterparty = ev.counterparty or (_slug(name) if name else None)
            if counterparty:
                doc["counterparty"] = counterparty
                doc["counterparty_name"] = name or counterparty
                doc["direction"] = direction
        await db.behavior_events.insert_one(doc)

    passport = await build_passport(merchant_id)
    await emit_passport(passport)
    return passport


_RECEIPT_MIME = {"image/jpeg", "image/png", "image/jpg", "image/webp"}


@router.post("/bill")
async def add_bill(
    kind: Literal["electricity", "water", "internet"] = Form(...),
    amount: int = Form(...),
    on_time: bool = Form(True),
    receipt: Optional[UploadFile] = File(None),
    user: User = Depends(require_kyc),
):
    """Log a utility bill with an optional supporting receipt image.

    The receipt is stored privately in GridFS, tagged with the owner's `uid`
    (same scheme as KYC files), and its id is kept on the behavior event so the
    "Timely Bill Payments" view can show the proof alongside each record.
    """
    receipt_uri: Optional[str] = None
    receipt_mime: Optional[str] = None
    if receipt is not None:
        mime = (receipt.content_type or "image/jpeg").lower()
        if mime not in _RECEIPT_MIME:
            raise HTTPException(status_code=400, detail=f"unsupported image type: {mime}")
        data = await receipt.read()
        bucket = get_gridfs_bucket()
        file_id = await bucket.upload_from_stream(
            f"{user.uid}/bill_{uuid.uuid4().hex[:8]}",
            data,
            metadata={"uid": user.uid, "kind": "bill_receipt", "mime": mime},
        )
        receipt_uri = str(file_id)
        receipt_mime = mime

    now = datetime.utcnow()
    db = get_db()
    await db.behavior_events.insert_one({
        "id": f"e_{uuid.uuid4().hex[:8]}",
        "merchant_id": user.merchant_id,
        "kind": kind,
        "date": now,
        "amount": amount,
        "on_time": on_time,
        "due_date": now,
        "receipt_uri": receipt_uri,
        "receipt_mime": receipt_mime,
    })

    passport = await build_passport(user.merchant_id)
    await emit_passport(passport)
    return passport


@router.get("/bills")
async def my_bills(user: User = Depends(get_current_user)):
    """List the caller's bill payments (newest first) for the timely-payments view."""
    db = get_db()
    cursor = db.behavior_events.find(
        {"merchant_id": user.merchant_id, "kind": {"$in": list(BILL_KINDS)}}
    ).sort("date", -1)
    bills = []
    async for ev in cursor:
        bills.append({
            "id": ev.get("id"),
            "kind": ev.get("kind"),
            "amount": ev.get("amount"),
            "on_time": ev.get("on_time"),
            "date": ev["date"].isoformat() if ev.get("date") else None,
            "receipt_uri": ev.get("receipt_uri"),
        })
    return {"bills": bills}


@router.get("/file/{file_id}")
async def get_my_file(file_id: str, user: User = Depends(get_current_user)):
    """Stream a stored file (e.g. a bill receipt). Owner-scoped by uid."""
    try:
        oid = ObjectId(file_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="invalid file id")

    bucket = get_gridfs_bucket()
    try:
        stream = await bucket.open_download_stream(oid)
    except Exception:
        raise HTTPException(status_code=404, detail="file not found")

    meta = stream.metadata or {}
    if meta.get("uid") != user.uid:
        raise HTTPException(status_code=403, detail="not your file")

    data = await stream.read()
    return Response(content=data, media_type=meta.get("mime", "image/jpeg"))


class MeAnswerIn(BaseModel):
    question_id: str
    text: Optional[str] = None
    audio_b64: Optional[str] = None
    audio_mime: str = "audio/webm"


@router.post("/interview/answer")
async def my_interview_answer(body: MeAnswerIn, user: User = Depends(require_kyc)):
    question = get_question(body.question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="unknown question_id")

    transcript = (body.text or "").strip()
    if not transcript and body.audio_b64:
        try:
            audio = base64.b64decode(body.audio_b64)
            transcript = await stt_nepali(audio, mime=body.audio_mime)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"speech-to-text failed: {e}")

    if not transcript:
        raise HTTPException(status_code=400, detail="provide `text` or `audio_b64`")

    answer = await score_answer(question, transcript)
    answer.merchant_id = user.merchant_id

    db = get_db()
    await db.psychometric_answers.update_one(
        {"merchant_id": user.merchant_id, "question_id": body.question_id},
        {"$set": answer.model_dump()},
        upsert=True,
    )

    passport = await build_passport(user.merchant_id)
    await emit_passport(passport)
    return {
        "transcript": transcript,
        "score": answer.score,
        "reliability": answer.reliability,
        "passport": passport,
    }
