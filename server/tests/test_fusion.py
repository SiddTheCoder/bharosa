from app.engines.fusion_engine import (
    apply_event,
    compute_trust,
    fold_evidence,
    posterior_stats,
)
from app.models.schemas import Evidence


def test_prior_gives_positive_small_loan():
    a, b = fold_evidence([])
    stats = posterior_stats(a, b)
    assert 300 <= stats["score"] <= 850
    assert stats["recommended_loan"] > 0


def test_positive_evidence_raises_score_and_confidence():
    a0, b0 = fold_evidence([])
    base = posterior_stats(a0, b0)
    strong = Evidence(source="behavior", label="x", value=1.0, reliability=1.0, k=10.0)
    a1, b1 = fold_evidence([strong])
    after = posterior_stats(a1, b1)
    assert after["score"] > base["score"]
    assert after["confidence"] > base["confidence"]


def test_negative_evidence_lowers_mean():
    base = posterior_stats(*fold_evidence([]))
    neg = Evidence(source="behavior", label="x", value=-1.0, reliability=1.0, k=10.0)
    after = posterior_stats(*fold_evidence([neg]))
    assert after["mean"] < base["mean"]


async def test_invisible_merchant_low_and_positive_loan():
    r = await compute_trust("sita_tea_shop")
    assert r["score"] < 600
    assert r["recommended_loan"] > 0
    assert r["fraud_risk"] == "LOW"


async def test_good_merchant_outranks_invisible():
    good = await compute_trust("good_merchant")
    invisible = await compute_trust("sita_tea_shop")
    assert good["score"] > invisible["score"]
    assert good["recommended_loan"] > invisible["recommended_loan"]
    assert good["confidence"] > invisible["confidence"]


async def test_apply_event_raises_score():
    before = await compute_trust("sita_tea_shop")
    strong = Evidence(source="behavior", label="on-time bill", value=1.0,
                      reliability=1.0, k=5.0, action_type="bill")
    after = await apply_event("sita_tea_shop", [strong])
    assert after["score"] > before["score"]
    # reset state so the suite is idempotent
    await compute_trust("sita_tea_shop")


async def test_fraud_target_high_risk():
    r = await compute_trust("fraud_target")
    assert r["fraud_risk"] == "HIGH"
