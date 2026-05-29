"""T23 — Self-scoped endpoints. Every action targets the caller's own merchant.

Reads (`GET /me/passport`) need only a logged-in user. Writes (events, interview
answers) additionally require a verified KYC status via `require_kyc`. The shared
`/merchant/{id}/...` and `/event` routes stay open for the lender/atlas view and
the seeded demo network.
"""
import base64
import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.deps import get_current_user, require_kyc
from app.db.mongo import get_db
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


class MeEventIn(BaseModel):
    kind: Literal[
        "electricity", "water", "internet", "airtime", "qr_revenue",
        "vouch", "guarantee",
    ]
    amount: Optional[int] = None
    on_time: Optional[bool] = None
    from_id: Optional[str] = None          # voucher (for vouch/guarantee)


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
        await db.behavior_events.insert_one({
            "id": f"e_{uuid.uuid4().hex[:8]}",
            "merchant_id": merchant_id,
            "kind": ev.kind,
            "date": now,
            "amount": ev.amount if ev.amount is not None else 1000,
            "on_time": ev.on_time if ev.kind in BILL_KINDS else None,
            "due_date": now if ev.kind in BILL_KINDS else None,
        })

    passport = await build_passport(merchant_id)
    await emit_passport(passport)
    return passport


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
