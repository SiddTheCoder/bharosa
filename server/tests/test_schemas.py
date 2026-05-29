from datetime import datetime

from app.models.schemas import (
    BehaviorEvent,
    Evidence,
    Merchant,
    PsychometricAnswer,
    TrustState,
    Vouch,
)


def test_instantiate_all_models():
    now = datetime.utcnow()
    m = Merchant(id="m1", name="Sita", business_type="tea_shop", created_at=now)
    assert m.is_anchor is False

    v = Vouch(id="v1", from_id="a1", to_id="m1", kind="guarantee", created_at=now)
    assert v.kind == "guarantee"

    e = BehaviorEvent(
        id="b1", merchant_id="m1", kind="electricity", date=now,
        amount=1200, on_time=True, due_date=now,
    )
    assert e.amount == 1200

    p = PsychometricAnswer(
        id="p1", merchant_id="m1", question_id="q1", trait="conscientiousness",
        transcript="...", score=0.8, reliability=0.6,
    )
    assert 0 <= p.score <= 1

    t = TrustState(merchant_id="m1", alpha=2.0, beta=3.0, updated_at=now)
    assert t.evidence_log == []


def test_evidence_round_trip():
    e = Evidence(
        source="behavior", label="11/12 on-time electricity bills",
        value=0.83, reliability=0.9, k=11.0, action_type="bill",
    )
    d = e.to_dict()
    assert d["source"] == "behavior" and d["action_type"] == "bill"
    e2 = Evidence.from_dict(d)
    assert e2 == e
