from app.engines.behavior_engine import behavioral_evidence, detect_seasonality


async def test_good_merchant_positive_evidence():
    ev = await behavioral_evidence("good_merchant")
    assert ev, "good merchant should have evidence"
    bill_items = [e for e in ev if e.action_type == "bill"]
    assert bill_items and bill_items[0].value > 0


async def test_seasonal_farmer_not_penalized():
    ev = await behavioral_evidence("seasonal_farmer")
    qr = [e for e in ev if e.action_type == "qr"]
    assert qr, "farmer should have a QR evidence item"
    assert qr[0].value >= 0, "seasonal income must not be penalized"
    assert "seasonal" in qr[0].label.lower()


async def test_invisible_merchant_empty():
    ev = await behavioral_evidence("sita_tea_shop")
    assert ev == []


def test_detect_seasonality_synthetic():
    # two years, harvest spike Apr-Jun
    series = []
    for _ in range(2):
        series += [5000, 5000, 5000, 40000, 42000, 41000, 15000, 15000, 15000, 12000, 12000, 12000]
    res = detect_seasonality(series)
    assert res["seasonal"] is True
    assert res["period_months"] == 12

    flat = [20000] * 24
    assert detect_seasonality(flat)["seasonal"] is False
