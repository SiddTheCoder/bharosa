"""Sensor 4 — commerce relationships: who the merchant trades with.

A QR total tells you *how much* a merchant earns; the *counterparties* tell you
whether that income is a real, embedded business. Two signals matter for credit:

  * **Customer regularity** — repeat customers paying on a steady cadence mean
    durable, predictable demand (not a one-off spike). We also flag the opposite:
    revenue dangerously *concentrated* in a single customer is a risk, not a win.
  * **Supplier relationships** — recurring outgoing payments to the same
    suppliers mean an operating supply chain (restocking) and a real trade
    history a lender can lean on.

Everything is derived from transaction-level events that carry a `counterparty`
and a direction (`in` = a customer paid the merchant, `out` = the merchant paid a
supplier). Pure functions do the detection so they're unit-testable without a DB;
thin async wrappers read the events.
"""
from __future__ import annotations

import math
from collections import defaultdict

import numpy as np

from app.db.mongo import get_db
from app.models.schemas import Evidence

REPEAT_MIN = 3            # transactions before a counterparty counts as "repeat"
CADENCE_MIN = 0.40       # cadence-regularity floor to call a relationship "recurring"
CONCENTRATION_CAP = 0.60  # a single customer above this share = over-reliance risk
TOP_N = 5                # how many counterparties to surface in the summary


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def _saturate(n: float, scale: float) -> float:
    """0..1, rising with n; `scale` is the soft midpoint."""
    return 1.0 - math.exp(-max(n, 0.0) / scale)


def _cadence_regularity(dates_sorted: list) -> float:
    """1 - normalized std of inter-payment day gaps, clamped to [0,1]."""
    if len(dates_sorted) < 3:
        return 0.0
    gaps = [
        (dates_sorted[i] - dates_sorted[i - 1]).days
        for i in range(1, len(dates_sorted))
    ]
    gaps = [g for g in gaps if g >= 0]
    if not gaps:
        return 0.0
    mean = float(np.mean(gaps))
    if mean <= 0:
        return 0.0
    return _clamp01(1.0 - float(np.std(gaps)) / mean)


def _months_span(dates_sorted: list) -> int:
    if not dates_sorted:
        return 0
    return max(1, round((dates_sorted[-1] - dates_sorted[0]).days / 30) + 1)


def _group(txns: list[dict]) -> list[dict]:
    """Per-counterparty rollup, richest (by total amount) first."""
    by: dict[str, list[dict]] = defaultdict(list)
    for t in txns:
        by[t["counterparty"]].append(t)

    rows: list[dict] = []
    for cp, items in by.items():
        items = sorted(items, key=lambda x: x["date"])
        dates = [i["date"] for i in items]
        regularity = _cadence_regularity(dates)
        n = len(items)
        rows.append({
            "counterparty": cp,
            "name": items[-1].get("name") or cp,
            "txns": n,
            "total_amount": round(sum(float(i["amount"]) for i in items)),
            "tenure_months": _months_span(dates),
            "regularity": round(regularity, 3),
            "recurring": n >= REPEAT_MIN and regularity >= CADENCE_MIN,
        })
    return sorted(rows, key=lambda r: r["total_amount"], reverse=True)


def _shares(rows: list[dict]) -> tuple[float, float]:
    """(HHI, top-counterparty share) over total amount — concentration metrics."""
    total = sum(r["total_amount"] for r in rows)
    if total <= 0:
        return 0.0, 0.0
    fracs = [r["total_amount"] / total for r in rows]
    return float(sum(f * f for f in fracs)), float(max(fracs))


def analyze_relationships(txns: list[dict]) -> dict:
    """Detect customers/suppliers and their regularity from normalized txns.

    Each txn: {direction: "in"|"out", counterparty: str, name: str,
               date: datetime, amount: float}.
    """
    incoming = [t for t in txns if t.get("direction") == "in"]
    outgoing = [t for t in txns if t.get("direction") == "out"]

    customers = _group(incoming)
    suppliers = _group(outgoing)

    repeat_customers = [c for c in customers if c["txns"] >= REPEAT_MIN]
    regular_customers = [c for c in customers if c["recurring"]]
    regular_suppliers = [s for s in suppliers if s["recurring"]]

    total_in = sum(c["total_amount"] for c in customers)
    repeat_revenue = sum(c["total_amount"] for c in repeat_customers)
    repeat_revenue_share = repeat_revenue / total_in if total_in > 0 else 0.0

    avg_cust_reg = (
        float(np.mean([c["regularity"] for c in regular_customers]))
        if regular_customers else 0.0
    )
    customer_regularity = _clamp01(0.5 * repeat_revenue_share + 0.5 * avg_cust_reg)

    hhi, top_share = _shares(customers)
    # Concentration only bites when there are alternatives to depend on instead.
    concentrated = bool(top_share > CONCENTRATION_CAP and len(customers) >= 2)

    avg_sup_reg = (
        float(np.mean([s["regularity"] for s in regular_suppliers]))
        if regular_suppliers else 0.0
    )
    supplier_stability = _clamp01(
        0.5 * avg_sup_reg + 0.5 * _saturate(len(regular_suppliers), 2.0)
    )

    return {
        "metrics": {
            "incoming_txns": len(incoming),
            "outgoing_txns": len(outgoing),
            "n_customers": len(customers),
            "n_repeat_customers": len(repeat_customers),
            "n_regular_customers": len(regular_customers),
            "repeat_revenue_share": round(repeat_revenue_share, 3),
            "customer_regularity": round(customer_regularity, 3),
            "n_suppliers": len(suppliers),
            "n_regular_suppliers": len(regular_suppliers),
            "supplier_stability": round(supplier_stability, 3),
            "hhi": round(hhi, 3),
            "top_customer_share": round(top_share, 3),
            "concentration_risk": concentrated,
        },
        "customers": customers[:TOP_N],
        "suppliers": suppliers[:TOP_N],
    }


def relationship_evidence_from_summary(summary: dict) -> list[Evidence]:
    """Turn a relationships summary into Bayesian Evidence items."""
    m = summary["metrics"]
    evidence: list[Evidence] = []

    # ── Customer loyalty: reward repeat demand; never penalize one-off walk-ins ──
    if m["incoming_txns"] >= REPEAT_MIN and m["n_repeat_customers"] >= 1:
        value = _clamp01(2 * m["customer_regularity"] - 1)
        pct = round(m["repeat_revenue_share"] * 100)
        n = m["n_repeat_customers"]
        evidence.append(Evidence(
            source="behavior",
            label=f"{n} repeat customer{'s' if n != 1 else ''} · {pct}% recurring revenue",
            value=value,
            reliability=_clamp01(m["incoming_txns"] / 12),
            k=2.5,
            action_type="customer",
        ))

    # ── Concentration risk: over-reliance on one buyer is a real, honest negative ──
    if m["concentration_risk"]:
        over = (m["top_customer_share"] - CONCENTRATION_CAP) / (1 - CONCENTRATION_CAP)
        pct = round(m["top_customer_share"] * 100)
        evidence.append(Evidence(
            source="behavior",
            label=f"revenue concentrated in one customer ({pct}%)",
            value=-_clamp01(over),
            reliability=_clamp01(m["incoming_txns"] / 12),
            k=1.5,
            action_type="customer",
        ))

    # ── Supplier relationships: an operating, restocking supply chain ──
    if m["n_regular_suppliers"] >= 1:
        value = _clamp01(2 * m["supplier_stability"] - 1)
        n = m["n_regular_suppliers"]
        evidence.append(Evidence(
            source="behavior",
            label=f"established supplier ties · {n} regular supplier{'s' if n != 1 else ''}",
            value=value,
            reliability=_clamp01(m["outgoing_txns"] / 12),
            k=2.0,
            action_type="supplier",
        ))

    return evidence


def relationships_from_events(events: list[dict]) -> dict:
    """Normalize raw behavior_events into txns, then analyze. Events without a
    `counterparty` (e.g. legacy monthly QR aggregates, bills) are ignored here."""
    txns: list[dict] = []
    for e in events:
        cp = e.get("counterparty")
        if not cp:
            continue
        kind = e.get("kind")
        if kind == "qr_revenue":
            direction = "in"
        elif kind == "supplier_payment":
            direction = "out"
        else:
            continue
        txns.append({
            "direction": e.get("direction", direction),
            "counterparty": cp,
            "name": e.get("counterparty_name") or cp,
            "date": e["date"],
            "amount": float(e.get("amount", 0) or 0),
        })
    return analyze_relationships(txns)


async def merchant_relationships(merchant_id: str) -> dict:
    """Relationship summary for a merchant, read from their behavior events."""
    db = get_db()
    events = await db.behavior_events.find({"merchant_id": merchant_id}).to_list(None)
    return relationships_from_events(events)


async def relationship_evidence(merchant_id: str) -> list[Evidence]:
    """Customer/supplier Evidence for the fusion engine."""
    summary = await merchant_relationships(merchant_id)
    return relationship_evidence_from_summary(summary)
