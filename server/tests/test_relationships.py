"""Unit tests for the relationships engine (pure functions, no DB)."""
from datetime import datetime, timedelta

from app.engines.relationships_engine import (
    analyze_relationships,
    relationship_evidence_from_summary,
    relationships_from_events,
)

BASE = datetime(2026, 5, 1)


def _monthly(counterparty, name, direction, n, amount=2000, start_month=0):
    """n payments roughly one month apart."""
    return [
        {
            "direction": direction,
            "counterparty": counterparty,
            "name": name,
            "date": BASE - timedelta(days=30 * (start_month + i)),
            "amount": amount,
        }
        for i in range(n)
    ]


def test_repeat_customers_detected():
    txns = (
        _monthly("ram", "Ram", "in", 6)
        + _monthly("sunita", "Sunita", "in", 5)
        + [{"direction": "in", "counterparty": f"w{i}", "name": "Walk-in",
            "date": BASE - timedelta(days=i), "amount": 500} for i in range(8)]
    )
    s = analyze_relationships(txns)
    m = s["metrics"]
    assert m["n_repeat_customers"] == 2
    assert m["n_regular_customers"] == 2          # monthly cadence → recurring
    assert m["customer_regularity"] > 0.4
    assert m["n_customers"] == 10                 # 2 loyal + 8 walk-ins


def test_established_suppliers_detected():
    txns = _monthly("dairy", "Himal Dairy", "out", 8, amount=10000) + _monthly(
        "grain", "Annapurna", "out", 6, amount=9000
    )
    s = analyze_relationships(txns)
    m = s["metrics"]
    assert m["n_regular_suppliers"] == 2
    assert m["supplier_stability"] > 0.4
    ev = relationship_evidence_from_summary(s)
    supplier_ev = [e for e in ev if e.action_type == "supplier"]
    assert supplier_ev and supplier_ev[0].value > 0


def test_concentration_risk_flagged():
    # One whale (90%+) + one small customer → over-reliance.
    txns = _monthly("whale", "Big Buyer", "in", 6, amount=50000) + _monthly(
        "small", "Tiny", "in", 3, amount=500
    )
    s = analyze_relationships(txns)
    assert s["metrics"]["concentration_risk"] is True
    assert s["metrics"]["top_customer_share"] > 0.6
    ev = relationship_evidence_from_summary(s)
    risk = [e for e in ev if e.value < 0]
    assert risk, "concentration should produce a negative-value evidence item"


def test_one_off_customers_not_penalized():
    # Only walk-ins, no repeats → no loyalty reward, but also no negative signal.
    txns = [
        {"direction": "in", "counterparty": f"w{i}", "name": "Walk-in",
         "date": BASE - timedelta(days=i), "amount": 800}
        for i in range(10)
    ]
    s = analyze_relationships(txns)
    assert s["metrics"]["n_repeat_customers"] == 0
    ev = relationship_evidence_from_summary(s)
    assert all(e.value >= 0 for e in ev)


def test_empty_is_safe():
    s = analyze_relationships([])
    assert s["metrics"]["n_customers"] == 0
    assert relationship_evidence_from_summary(s) == []


def test_relationships_from_events_maps_kind_to_direction():
    events = [
        {"kind": "qr_revenue", "counterparty": "ram", "counterparty_name": "Ram",
         "date": BASE, "amount": 2000},
        {"kind": "supplier_payment", "counterparty": "dairy", "counterparty_name": "Dairy",
         "date": BASE, "amount": 9000},
        {"kind": "electricity", "date": BASE, "amount": 1500},   # no counterparty → ignored
        {"kind": "qr_revenue", "date": BASE, "amount": 30000},   # legacy aggregate → ignored
    ]
    s = relationships_from_events(events)
    assert s["metrics"]["n_customers"] == 1
    assert s["metrics"]["n_suppliers"] == 1
