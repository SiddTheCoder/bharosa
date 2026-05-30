"""Sensor 3 — behavioural proxies.

Turns everyday digital footprint (utility bills, airtime, QR revenue) into
normalized `Evidence`. Detects harvest seasonality so a farmer's lean months
are NOT mistaken for instability.
"""
from __future__ import annotations

import numpy as np

from app.db.mongo import get_db
from app.engines.seasonality import analyze, detect_seasonality  # noqa: F401 (re-exported)
from app.models.schemas import Evidence

BILL_KINDS = ("electricity", "water", "internet")


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _coeff_of_variation(values: list[float]) -> float:
    arr = np.asarray(values, dtype=float)
    mean = arr.mean()
    if mean <= 0:
        return 1.0
    return float(arr.std() / mean)


def _regularity(dates_sorted: list) -> float:
    """1 - normalized_std of inter-event day gaps, clamped to [0,1]."""
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
    norm_std = float(np.std(gaps)) / mean
    return _clamp01(1.0 - norm_std)


async def behavioral_evidence(merchant_id: str) -> list[Evidence]:
    db = get_db()
    events = await db.behavior_events.find({"merchant_id": merchant_id}).to_list(None)
    if not events:
        return []

    evidence: list[Evidence] = []

    # ── Utility bills: on-time ratio + regularity ──
    bills = [e for e in events if e["kind"] in BILL_KINDS]
    if bills:
        total = len(bills)
        on_time = sum(1 for b in bills if b.get("on_time"))
        ratio = on_time / total
        evidence.append(Evidence(
            source="behavior",
            label=f"{on_time}/{total} on-time utility bills",
            value=2 * ratio - 1,
            reliability=_clamp01(total / 12),
            k=min(float(total), 12.0),
            action_type="bill",
        ))
        reg = _regularity(sorted(b["date"] for b in bills))
        if reg > 0:
            evidence.append(Evidence(
                source="behavior",
                label="regular bill-payment cadence",
                value=2 * reg - 1,
                reliability=_clamp01(total / 12),
                k=2.0,
                action_type="bill",
            ))

    # ── Airtime cadence ──
    airtime = [e for e in events if e["kind"] == "airtime"]
    if len(airtime) >= 3:
        cadence = _regularity(sorted(a["date"] for a in airtime))
        evidence.append(Evidence(
            source="behavior",
            label="consistent airtime top-ups",
            value=2 * cadence - 1,
            reliability=_clamp01(len(airtime) / 12),
            k=2.0,
            action_type="airtime",
        ))

    # ── QR revenue (seasonality-aware) ──
    qr = sorted((e for e in events if e["kind"] == "qr_revenue"), key=lambda e: e["date"])
    if len(qr) >= 3:
        series = [float(e["amount"]) for e in qr]
        months = [e["date"].month for e in qr]
        season = analyze(series, months)
        if season["seasonal"]:
            # A predictable harvest cycle is a *positive* signal, not noise. We
            # reward both how steady this year is vs a typical one (stability) and
            # how confidently the pattern recurs (predictability), and never let a
            # recognized season push the value negative — lean months are expected.
            signal = 0.5 * season["stability"] + 0.5 * season["predictability"]
            value = _clamp01(2 * signal - 1)
            label = "predictable seasonal (harvest) income"
            # Thin history → lower predictability → less weight, never a penalty.
            reliability = _clamp01(len(qr) / 12) * (0.6 + 0.4 * season["predictability"])
        else:
            stability = _clamp01(1.0 - _coeff_of_variation(series))
            value = 2 * stability - 1
            label = "stable QR revenue"
            reliability = _clamp01(len(qr) / 12)
        evidence.append(Evidence(
            source="behavior",
            label=label,
            value=value,
            reliability=reliability,
            k=3.0,
            action_type="qr",
        ))

    return evidence
