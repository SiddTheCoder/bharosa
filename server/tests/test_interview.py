"""T9 — Psychometric interview acceptance.

score_answer yields a valid 0..1 reading; reverse-coded items invert; and a
typed interview round lifts the merchant's confidence via /interview/answer.
"""
import uuid

import httpx

from app.interview.scoring import score_answer
from app.interview.state_machine import QUESTIONS, get_question
from app.main import app


def _client() -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


async def test_score_answer_in_range():
    q = get_question("q1_planning")
    ans = await score_answer(
        q, "I save most of it for slow months and reinvest some into more stock."
    )
    assert 0.0 <= ans.score <= 1.0
    assert 0.0 <= ans.reliability <= 1.0
    assert ans.trait == "conscientiousness"


async def test_get_questions_endpoint():
    async with _client() as c:
        r = await c.get("/interview/questions")
    assert r.status_code == 200
    ids = {q["id"] for q in r.json()["questions"]}
    assert ids == {q["id"] for q in QUESTIONS}


async def test_interview_raises_confidence():
    mid = f"interviewee_{uuid.uuid4().hex[:8]}"
    good_answers = {
        "q1_planning": "I save most of it and reinvest some into more stock for busy months.",
        "q2_followthrough": "I write the due date down and set aside a little each day so I can repay on time.",
        "q3_impulse": "No, I am careful and save before I spend.",
        "q4_prudence": "No, I would not risk my savings on something that could lose everything.",
        "q5_buffer": "Yes, I always keep emergency money separate from the shop cash.",
        "q6_gamble": "No, I avoid big uncertain gambles with money.",
    }

    async with _client() as c:
        before = (await c.get(f"/merchant/{mid}/passport")).json()
        last = None
        for qid, text in good_answers.items():
            r = await c.post(
                f"/interview/{mid}/answer", json={"question_id": qid, "text": text}
            )
            assert r.status_code == 200
            last = r.json()["passport"]

    assert last["confidence"] > before["confidence"]
