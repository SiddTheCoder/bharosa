"""Seasonality engine — turns a merchant's monthly revenue into a cash-flow
profile a seasonal business can actually borrow against.

A farmer is not *unstable*; they are *predictably uneven*. Some months boom
(harvest), some are lean (pre-harvest), the rest are neutral. The mistake a
naive scorer makes is reading that swing as risk. This module instead:

  * classifies each calendar month as **boom / neutral / lean** vs the
    merchant's *own* baseline (not an absolute one),
  * scores **predictability** — the real creditworthiness signal for a seasonal
    business: with >=2 years we measure how *repeatable* each month is across
    years; with a single year we fall back to the *smoothness* of the harvest
    shape, so a clean cycle is trusted while chaotic noise is not (no false
    "seasonal" verdict for a genuinely erratic merchant),
  * measures **deseasonalized stability** — once the expected seasonal shape is
    removed, how close is this year to a typical year,
  * builds a **harvest-weighted repayment schedule**: large instalments in the
    boom months, light grace instalments in the lean ones.

Works from as little as ~6 months and degrades gracefully — less history just
means lower predictability (and therefore lower weight/confidence downstream),
never a false instability penalty.
"""
from __future__ import annotations

from collections import defaultdict

import numpy as np

from app.db.mongo import get_db

PERIOD = 12
MONTH_NAMES = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
}

MIN_DATA_MONTHS = 4          # below this, no seasonal verdict at all
MIN_PROFILE_MONTHS = 6       # distinct calendar months needed to read a "shape"
BOOM_Z = 0.5                 # >= mean + 0.5*sd  → boom month
LEAN_Z = 0.5                 # <= mean - 0.5*sd  → lean month
AMPLITUDE_MIN = 0.40         # peak-to-trough swing (as a fraction of mean)
PREDICTABILITY_MIN = 0.45    # confidence floor to call a pattern "seasonal"
AUTOCORR_MIN = 0.30          # lag-12 autocorrelation floor (multi-year path)


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def _cv(values) -> float:
    """Coefficient of variation; 1.0 (max instability) when the mean is non-positive."""
    arr = np.asarray(values, dtype=float)
    mean = arr.mean()
    if mean <= 0:
        return 1.0
    return float(arr.std() / mean)


def _autocorr(series: list[float], lag: int) -> float:
    x = np.asarray(series, dtype=float)
    if len(x) <= lag:
        return 0.0
    x = x - x.mean()
    denom = float(np.sum(x * x))
    if denom <= 0:
        return 0.0
    return float(np.sum(x[lag:] * x[:-lag]) / denom)


def _calendar_profile(series: list[float], months: list[int]) -> tuple[dict, dict]:
    """Average revenue per calendar month, plus the raw per-month observations."""
    buckets: dict[int, list[float]] = defaultdict(list)
    for v, m in zip(series, months):
        buckets[m].append(float(v))
    profile = {m: float(np.mean(vs)) for m, vs in buckets.items()}
    return profile, buckets


def _classify(profile: dict, mean: float, std: float) -> dict:
    tiers = {}
    for m, v in profile.items():
        if std > 0 and v >= mean + BOOM_Z * std:
            tiers[m] = "boom"
        elif std > 0 and v <= mean - LEAN_Z * std:
            tiers[m] = "lean"
        else:
            tiers[m] = "neutral"
    return tiers


def _smoothness(profile: dict) -> float:
    """How smooth the seasonal shape is, month-to-month (lag-1 autocorrelation).

    A real harvest cycle moves in contiguous runs (lean→lean→boom→boom), giving
    high positive autocorrelation. Scattered noise alternates and scores ~0, so a
    single chaotic year is *not* mistaken for a predictable season.
    """
    ordered = [v for _, v in sorted(profile.items())]
    if len(ordered) < 3:
        return 0.0
    return _clamp01(_autocorr(ordered, lag=1))


def _predictability(series: list[float], months: list[int], profile: dict) -> float:
    """0..1 — how confidently we can expect the same pattern to recur."""
    buckets: dict[int, list[float]] = defaultdict(list)
    for v, m in zip(series, months):
        buckets[m].append(float(v))
    repeated = [vs for vs in buckets.values() if len(vs) >= 2]

    # Multi-year: judge by how tightly each calendar month repeats across years.
    if len(repeated) >= max(2, len(profile) // 2):
        per_month_cv = [_cv(vs) for vs in repeated]
        return _clamp01(1.0 - float(np.mean(per_month_cv)))

    # Single (or sparse) cycle: we can't confirm repetition, so trust the shape.
    return _clamp01(0.35 + 0.5 * _smoothness(profile))


def _deseasonalize(series: list[float], months: list[int], profile: dict,
                   overall: float) -> list[float]:
    """Divide each value by its month's seasonal factor (profile / overall mean)."""
    out = []
    for v, m in zip(series, months):
        factor = profile.get(m, overall) / overall if overall > 0 else 1.0
        out.append(v / factor if factor > 0 else v)
    return out


def _empty(n: int = 0) -> dict:
    return {
        "data_months": n,
        "seasonal": False,
        "predictability": 0.0,
        "stability": 0.0,
        "amplitude": 0.0,
        "period_months": None,
        "peak_months": [],
        "lean_months": [],
        "cashflow": [],
    }


def analyze(series: list[float], months: list[int] | None = None) -> dict:
    """Analyze a monthly-revenue series.

    `months` is the parallel list of 1..12 calendar months for each value. When
    omitted, positions are folded onto a synthetic 12-month cycle (used by the
    legacy `detect_seasonality` helper); real callers should pass true months so
    repeatability across years can be measured.
    """
    n = len(series)
    if n == 0:
        return _empty(0)
    if months is None:
        months = [(i % PERIOD) + 1 for i in range(n)]

    arr = np.asarray(series, dtype=float)
    overall = float(arr.mean())

    profile, _ = _calendar_profile(series, months)
    pvals = list(profile.values())
    pmean = float(np.mean(pvals))
    pstd = float(np.std(pvals))

    amplitude = _clamp01((max(pvals) - min(pvals)) / overall) if overall > 0 else 0.0
    tiers = _classify(profile, pmean, pstd)
    predictability = _predictability(series, months, profile)

    deseason = _deseasonalize(series, months, profile, overall) if overall > 0 else series
    stability = _clamp01(1.0 - _cv(deseason))

    has_structure = (
        any(t == "boom" for t in tiers.values())
        and any(t == "lean" for t in tiers.values())
    )
    seasonal = bool(
        n >= MIN_DATA_MONTHS
        and len(profile) >= MIN_PROFILE_MONTHS
        and amplitude >= AMPLITUDE_MIN
        and has_structure
        and predictability >= PREDICTABILITY_MIN
    )

    peak_months = sorted(m for m, t in tiers.items() if t == "boom")
    lean_months = sorted(m for m, t in tiers.items() if t == "lean")

    total = sum(pvals)
    cashflow = [
        {
            "month": m,
            "name": MONTH_NAMES[m],
            "avg_revenue": round(profile[m]),
            "tier": tiers[m],
            "weight": round(profile[m] / total, 4) if total > 0 else round(1 / len(profile), 4),
        }
        for m in sorted(profile)
    ]

    return {
        "data_months": n,
        "seasonal": seasonal,
        "predictability": round(predictability, 4),
        "stability": round(stability, 4),
        "amplitude": round(amplitude, 4),
        "period_months": PERIOD if seasonal else None,
        "peak_months": peak_months,
        "lean_months": lean_months,
        "cashflow": cashflow,
    }


def detect_seasonality(monthly_revenue: list[float]) -> dict:
    """Back-compat shim: the legacy {seasonal, period_months, peak_months} view."""
    r = analyze(monthly_revenue)
    return {
        "seasonal": r["seasonal"],
        "period_months": r["period_months"],
        "peak_months": r["peak_months"],
    }


def repayment_schedule(cashflow: list[dict], principal: int) -> list[dict]:
    """Distribute `principal` repayment across the year, proportional to expected
    cash flow: heavy in boom months, light grace instalments in lean months."""
    if not cashflow or principal <= 0:
        return []
    return [
        {
            "month": c["month"],
            "name": c["name"],
            "tier": c["tier"],
            "weight": c["weight"],
            "repay_npr": int(round(principal * c["weight"])),
        }
        for c in cashflow
    ]


def schedule_note(season: dict) -> str:
    """One-line, human-readable repayment guidance for the lender/passport view."""
    if not season.get("seasonal"):
        return "standard monthly"
    booms = ", ".join(MONTH_NAMES[m] for m in season.get("peak_months", []))
    leans = ", ".join(MONTH_NAMES[m] for m in season.get("lean_months", []))
    booms = booms or "the harvest months"
    leans = leans or "the lean months"
    return (
        f"Harvest-weighted: larger repayments in {booms}; "
        f"light grace instalments in {leans}."
    )


def season_from_events(qr_events: list[dict]) -> dict:
    """Build a season analysis from raw `qr_revenue` behavior events.

    Multiple events in the same calendar month are summed before analysis.
    """
    if not qr_events:
        return _empty(0)
    monthly: dict[tuple[int, int], float] = defaultdict(float)
    for e in qr_events:
        d = e["date"]
        monthly[(d.year, d.month)] += float(e.get("amount", 0) or 0)
    keys = sorted(monthly)
    series = [monthly[k] for k in keys]
    months = [k[1] for k in keys]
    return analyze(series, months)


async def merchant_season(merchant_id: str) -> dict:
    """Season analysis for a merchant, read from their stored QR revenue events."""
    db = get_db()
    qr = await db.behavior_events.find(
        {"merchant_id": merchant_id, "kind": "qr_revenue"}
    ).to_list(None)
    return season_from_events(qr)
