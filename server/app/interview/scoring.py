"""T9 — Score a free-text interview answer into a psychometric signal.

An LLM reads the situational answer and rates how favorable it is for the
question's trait, plus how confidently the answer can be judged. The prompt
demands strict JSON; we parse defensively with one retry and fall back to a
neutral, low-reliability reading so a flaky model never blocks the interview.
"""
from __future__ import annotations

import json
import logging
import re
import uuid

from app.llm import llm_chat
from app.models.schemas import PsychometricAnswer

logger = logging.getLogger(__name__)

_SYSTEM = (
    "You are a fair, culturally-aware psychometric rater for micro-merchant "
    "credit assessment in Nepal. You read a merchant's spoken answer to a "
    "situational question and rate it for ONE personality trait. Be warm and "
    "non-judgemental; do not penalise poverty or simple language. "
    "Respond with STRICT JSON only, no prose, no markdown: "
    '{"score": <0..1>, "reliability": <0..1>, "rationale": "<one short sentence>"}. '
    "score: 1.0 = strongly favourable for the trait, 0.0 = strongly unfavourable. "
    "reliability: how clearly the answer reveals the trait (vague/off-topic = low)."
)


def _build_prompt(question: dict, transcript: str) -> list[dict]:
    trait = question["trait"]
    return [
        {"role": "system", "content": _SYSTEM},
        {
            "role": "user",
            "content": (
                f"Trait being measured: {trait}.\n"
                f"Question: {question['text_en']}\n"
                f"Merchant's answer: \"{transcript}\"\n"
                "Rate how favourable this answer is for the trait. JSON only."
            ),
        },
    ]


def _parse(text: str) -> dict | None:
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if "score" not in data:
        return None
    return data


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


async def score_answer(question: dict, transcript: str) -> PsychometricAnswer:
    """LLM-rate a transcript; reverse-code if needed; return a persistable answer."""
    prompt = _build_prompt(question, transcript)

    data = None
    for _ in range(2):  # one retry on parse failure
        try:
            text, _provider = await llm_chat(prompt)
            data = _parse(text)
            if data is not None:
                break
        except Exception as e:  # boundary: model may be down — fall through to neutral
            logger.warning("score_answer LLM call failed: %s", e)

    if data is None:
        score, reliability = 0.5, 0.2  # neutral, low-confidence fallback
    else:
        score = _clamp01(data.get("score", 0.5))
        reliability = _clamp01(data.get("reliability", 0.5))

    if question.get("reverse_coded"):
        score = 1.0 - score

    return PsychometricAnswer(
        id=f"pa_{uuid.uuid4().hex[:8]}",
        merchant_id="",  # set by the caller before persisting
        question_id=question["id"],
        trait=question["trait"],
        transcript=transcript,
        score=score,
        reliability=reliability,
    )
