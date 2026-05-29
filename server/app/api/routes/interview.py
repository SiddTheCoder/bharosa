"""T9 — Psychometric interview endpoints (Sensor 2).

Localized questions out, spoken-or-typed answers in. Each answer is scored by
the LLM, stored, and triggers a passport rebuild so the merchant's confidence
climbs live as they complete the interview.
"""
import base64
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.mongo import get_db
from app.interview.scoring import score_answer
from app.interview.state_machine import QUESTIONS, get_question
from app.interview.voice_elevenlabs import stt_nepali
from app.live.socket import emit_passport
from app.services.passport_service import build_passport

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview")


@router.get("/questions")
async def get_questions():
    """Localized SJT items for the merchant interview."""
    return {"questions": QUESTIONS}


class AnswerIn(BaseModel):
    question_id: str
    text: Optional[str] = None              # typed answer (fallback path)
    audio_b64: Optional[str] = None         # base64 webm/opus (voice path)
    audio_mime: str = "audio/webm"


@router.post("/{merchant_id}/answer")
async def post_answer(merchant_id: str, body: AnswerIn):
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
    answer.merchant_id = merchant_id

    db = get_db()
    await db.psychometric_answers.update_one(
        {"merchant_id": merchant_id, "question_id": body.question_id},
        {"$set": answer.model_dump()},
        upsert=True,
    )

    passport = await build_passport(merchant_id)
    await emit_passport(passport)
    return {
        "transcript": transcript,
        "score": answer.score,
        "reliability": answer.reliability,
        "passport": passport,
    }
