from app.engines.explainer import (
    actions_for_delta,
    evidence_delta_to,
    explain,
    next_tier_target,
)


def test_next_tier_target():
    assert next_tier_target(0.30)[0] == "starter"
    assert next_tier_target(0.50)[0] == "growth"
    assert next_tier_target(0.70)[0] == "established"
    assert next_tier_target(0.90) is None


def test_evidence_delta_inverse():
    # mean currently 0.5 (alpha=beta=5); to reach 0.65 with beta=5:
    # alpha_needed = 0.65*5/0.35 ≈ 9.29 -> delta ≈ 4.29
    delta = evidence_delta_to(0.65, 5.0, 5.0)
    assert 4.0 < delta < 4.6


def test_actions_for_delta():
    acts = actions_for_delta(2.5)
    assert len(acts) == 2
    assert "bill" in acts[0]
    assert "vouch" in acts[1]
    assert actions_for_delta(0) == []


async def test_explain_good_merchant():
    out = await explain("good_merchant")
    assert out["why"]
    assert isinstance(out["next_steps"], list)
    assert len(out["next_steps"]) >= 1
