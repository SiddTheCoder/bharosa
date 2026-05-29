from app.engines.graph_engine import (
    build_graph,
    detect_fraud_rings,
    propagate_trust,
    social_evidence,
)
from app.db.mongo import get_db


async def _anchors():
    db = get_db()
    return [m["id"] async for m in db.merchants.find({"is_anchor": True})]


async def test_fraud_ring_detected():
    G = await build_graph()
    rings = detect_fraud_rings(G, await _anchors())
    flagged = set().union(*rings) if rings else set()
    assert "fraud_target" in flagged
    assert any(f"fraud_ring_{i}" in flagged for i in range(1, 5))


async def test_fraud_target_discounted():
    ev, report = await social_evidence("fraud_target")
    assert report["in_ring"] is True
    assert all(e.value == 0.0 for e in ev)


async def test_good_merchant_positive_social():
    ev, report = await social_evidence("good_merchant")
    assert report["in_ring"] is False
    assert ev and ev[0].value > 0


async def test_anchors_not_flagged():
    G = await build_graph()
    anchors = await _anchors()
    rings = detect_fraud_rings(G, anchors)
    flagged = set().union(*rings) if rings else set()
    assert not (set(anchors) & flagged)


async def test_trust_anchor_highest():
    G = await build_graph()
    anchors = await _anchors()
    trust = propagate_trust(G, anchors)
    # an anchor should out-trust the fraud target
    assert trust[anchors[0]] > trust.get("fraud_target", 0.0)
