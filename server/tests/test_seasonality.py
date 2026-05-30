"""Unit tests for the seasonality engine (pure functions, no DB)."""
from app.engines.seasonality import (
    analyze,
    repayment_schedule,
    schedule_note,
    season_from_events,
)

# One harvest year: lean Jan–Mar, boom Apr–Jun, neutral Jul–Dec.
HARVEST_MONTHS = list(range(1, 13))
HARVEST_SERIES = [5000, 5000, 5000, 42000, 42000, 42000,
                  14000, 14000, 14000, 14000, 14000, 14000]


def test_smooth_single_year_is_seasonal_and_not_penalized():
    s = analyze(HARVEST_SERIES, HARVEST_MONTHS)
    assert s["seasonal"] is True
    assert set(s["peak_months"]) >= {4, 5, 6}
    assert set(s["lean_months"]) >= {1, 2, 3}
    assert s["predictability"] >= 0.45
    # The signal a seasonal merchant earns is never a penalty.
    signal = 0.5 * s["stability"] + 0.5 * s["predictability"]
    assert 2 * signal - 1 >= 0


def test_chaotic_single_year_is_not_called_seasonal():
    # Alternating spikes: high amplitude but no coherent shape → must NOT pass.
    chaotic = [5000, 42000, 5000, 42000, 5000, 42000,
               5000, 42000, 5000, 42000, 5000, 42000]
    s = analyze(chaotic, HARVEST_MONTHS)
    assert s["seasonal"] is False


def test_two_years_repeatable_is_highly_predictable():
    series = HARVEST_SERIES * 2
    months = HARVEST_MONTHS * 2
    s = analyze(series, months)
    assert s["seasonal"] is True
    assert s["period_months"] == 12
    assert s["predictability"] > 0.7  # repeats tightly across both years


def test_flat_revenue_is_not_seasonal():
    s = analyze([20000] * 12, HARVEST_MONTHS)
    assert s["seasonal"] is False
    assert s["peak_months"] == [] and s["lean_months"] == []


def test_too_little_history_is_not_seasonal():
    s = analyze([5000, 42000, 14000], [1, 4, 7])
    assert s["seasonal"] is False
    assert s["data_months"] == 3


def test_repayment_schedule_is_harvest_weighted():
    s = analyze(HARVEST_SERIES, HARVEST_MONTHS)
    plan = repayment_schedule(s["cashflow"], 120_000)
    by_month = {p["month"]: p for p in plan}
    boom = by_month[5]
    lean = by_month[1]
    assert boom["tier"] == "boom" and lean["tier"] == "lean"
    assert boom["repay_npr"] > lean["repay_npr"]
    # Instalments add up to roughly the principal (rounding aside).
    total = sum(p["repay_npr"] for p in plan)
    assert abs(total - 120_000) <= len(plan)


def test_schedule_note_mentions_boom_months_when_seasonal():
    s = analyze(HARVEST_SERIES, HARVEST_MONTHS)
    note = schedule_note(s)
    assert "Harvest-weighted" in note
    assert any(m in note for m in ("Apr", "May", "Jun"))


def test_schedule_note_standard_when_not_seasonal():
    s = analyze([20000] * 12, HARVEST_MONTHS)
    assert schedule_note(s) == "standard monthly"


def test_season_from_events_sums_same_month():
    from datetime import datetime

    events = [
        {"date": datetime(2025, 4, 1), "amount": 20000},
        {"date": datetime(2025, 4, 20), "amount": 22000},  # same month → summed
        {"date": datetime(2025, 1, 5), "amount": 5000},
    ]
    s = season_from_events(events)
    assert s["data_months"] == 2  # April collapsed into one bucket
