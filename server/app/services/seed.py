"""Seed the bharosa MongoDB with a realistic demo ecosystem.

Run:  python -m app.services.seed

The quality of the demo story lives here. Stable IDs are used for the
demo merchants so the frontend / demo panel can reference them directly:

    sita_tea_shop   - fully invisible (zero events, zero vouches)
    good_merchant   - 11/12 on-time bills, steady airtime, 4 anchor-traceable vouches
    seasonal_farmer - harvest-cycle QR revenue across 2 years
    fraud_target    - target of a planted reciprocal fraud ring (no anchor inflow)
"""
import asyncio
import logging
import random
import uuid
from datetime import datetime, timedelta

from app.db.mongo import connect_to_mongo, close_mongo, get_db

logger = logging.getLogger(__name__)
random.seed(42)

NOW = datetime(2026, 5, 29)
BUSINESS_TYPES = ["tea_shop", "vegetable", "vendor", "tailor", "grocery", "barber"]


def _mid(prefix: str = "m") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def merchant(id, name, business_type, is_anchor=False, created_days_ago=400):
    return {
        "id": id,
        "name": name,
        "business_type": business_type,
        "is_anchor": is_anchor,
        "created_at": NOW - timedelta(days=created_days_ago),
    }


def vouch(from_id, to_id, kind="vouch", days_ago=200):
    return {
        "id": _mid("v"),
        "from_id": from_id,
        "to_id": to_id,
        "kind": kind,
        "created_at": NOW - timedelta(days=days_ago),
    }


def bill(merchant_id, kind, months_ago, amount, on_time):
    date = NOW - timedelta(days=30 * months_ago)
    due = date + timedelta(days=3 if on_time else 15)
    return {
        "id": _mid("b"),
        "merchant_id": merchant_id,
        "kind": kind,
        "date": date,
        "amount": amount,
        "on_time": on_time,
        "due_date": due,
    }


def airtime(merchant_id, months_ago, amount):
    return {
        "id": _mid("a"),
        "merchant_id": merchant_id,
        "kind": "airtime",
        "date": NOW - timedelta(days=30 * months_ago),
        "amount": amount,
        "on_time": None,
        "due_date": None,
    }


def qr(merchant_id, months_ago, amount):
    return {
        "id": _mid("q"),
        "merchant_id": merchant_id,
        "kind": "qr_revenue",
        "date": NOW - timedelta(days=30 * months_ago),
        "amount": amount,
        "on_time": None,
        "due_date": None,
    }


def build_dataset():
    merchants: list[dict] = []
    vouches: list[dict] = []
    events: list[dict] = []

    # ── Anchors (verified, established) ──
    anchors = [
        merchant("anchor_coop", "Lalitpur Cooperative", "grocery", is_anchor=True, created_days_ago=1500),
        merchant("anchor_dairy", "Himal Dairy", "grocery", is_anchor=True, created_days_ago=1400),
        merchant("anchor_hardware", "Everest Hardware", "vendor", is_anchor=True, created_days_ago=1300),
        merchant("anchor_pharmacy", "Bagmati Pharmacy", "vendor", is_anchor=True, created_days_ago=1200),
    ]
    merchants += anchors
    anchor_ids = [a["id"] for a in anchors]

    # ── Normal merchants with varied histories ──
    normals = []
    for i in range(32):
        m = merchant(_mid(), f"Merchant {i+1}", random.choice(BUSINESS_TYPES),
                     created_days_ago=random.randint(120, 900))
        normals.append(m)
        merchants.append(m)
        # behavioural history of varying richness
        n_bills = random.randint(0, 12)
        for mo in range(1, n_bills + 1):
            events.append(bill(m["id"], random.choice(["electricity", "water", "internet"]),
                               mo, random.randint(800, 2500), random.random() > 0.25))
        for mo in range(1, random.randint(0, 10) + 1):
            events.append(airtime(m["id"], mo, random.choice([100, 200, 300])))
        for mo in range(1, 13):
            base = random.randint(15000, 45000)
            events.append(qr(m["id"], mo, base + random.randint(-3000, 3000)))

    # normal vouch network: anchors vouch some normals; normals vouch each other
    for m in random.sample(normals, 12):
        voucher = random.choice(anchor_ids)
        vouches.append(vouch(voucher, m["id"], "vouch", random.randint(60, 300)))
    for _ in range(20):
        a, b = random.sample(normals, 2)
        vouches.append(vouch(a["id"], b["id"], "vouch", random.randint(30, 250)))

    # ── DEMO 1: fully invisible merchant ──
    sita = merchant("sita_tea_shop", "Sita's Tea Shop", "tea_shop", created_days_ago=20)
    merchants.append(sita)  # zero events, zero vouches

    # ── DEMO 2: good merchant ──
    good = merchant("good_merchant", "Gita's Grocery", "grocery", created_days_ago=500)
    merchants.append(good)
    # 12 electricity bills, 11 on-time (one late)
    for mo in range(1, 13):
        events.append(bill(good["id"], "electricity", mo, 1500, on_time=(mo != 7)))
    # steady airtime top-ups every month
    for mo in range(1, 13):
        events.append(airtime(good["id"], mo, 200))
    # stable QR revenue
    for mo in range(1, 13):
        events.append(qr(good["id"], mo, 30000 + random.randint(-1500, 1500)))
    # 4 anchor-traceable vouches (2 direct from anchors, 2 from anchor-vouched normals)
    vouches.append(vouch(anchor_ids[0], good["id"], "guarantee", 180))
    vouches.append(vouch(anchor_ids[1], good["id"], "vouch", 150))
    vouches.append(vouch(normals[0]["id"], good["id"], "vouch", 120))
    vouches.append(vouch(normals[1]["id"], good["id"], "vouch", 90))
    # ensure those two normals are anchor-traceable
    vouches.append(vouch(anchor_ids[2], normals[0]["id"], "vouch", 220))
    vouches.append(vouch(anchor_ids[3], normals[1]["id"], "vouch", 210))

    # ── DEMO 3: seasonal farmer (harvest cycle, 2 years) ──
    farmer = merchant("seasonal_farmer", "Hari the Farmer", "farmer", created_days_ago=800)
    merchants.append(farmer)
    # months_ago 1..24; month-of-year drives the seasonal pattern.
    for mo in range(1, 25):
        month_of_year = ((NOW.month - mo - 1) % 12) + 1  # 1..12
        if month_of_year in (1, 2, 3):          # lean (pre-harvest)
            amt = random.randint(4000, 7000)
        elif month_of_year in (4, 5, 6):        # harvest spike
            amt = random.randint(38000, 46000)
        else:
            amt = random.randint(12000, 18000)  # moderate
        events.append(qr(farmer["id"], mo, amt))
    # a few utility bills so the farmer isn't invisible
    for mo in range(1, 9):
        events.append(bill(farmer["id"], "electricity", mo, 900, on_time=(random.random() > 0.3)))
    vouches.append(vouch(anchor_ids[0], farmer["id"], "vouch", 160))

    # ── DEMO 4: planted fraud ring (reciprocal, no anchor inflow) ──
    ring = [merchant(f"fraud_ring_{i}", f"Ghost Trader {i}", "vendor", created_days_ago=15)
            for i in range(1, 5)]
    target = merchant("fraud_target", "Suspicious Stall", "vendor", created_days_ago=12)
    merchants += ring + [target]
    ring_ids = [r["id"] for r in ring] + [target["id"]]
    # reciprocal cycle among ring members (A<->B<->C<->D<->A) - all created in a burst
    for i in range(len(ring_ids)):
        a = ring_ids[i]
        b = ring_ids[(i + 1) % len(ring_ids)]
        vouches.append(vouch(a, b, "vouch", random.randint(8, 14)))
        vouches.append(vouch(b, a, "vouch", random.randint(8, 14)))
    # everyone in the ring also vouches the target (inflate it)
    for r in ring:
        vouches.append(vouch(r["id"], target["id"], "guarantee", random.randint(8, 14)))
    # NOTE: zero vouches from any anchor into the ring.

    return merchants, vouches, events


async def seed():
    await connect_to_mongo()
    db = get_db()
    merchants, vouches, events = build_dataset()

    for col in ("merchants", "vouches", "behavior_events",
                "psychometric_answers", "trust_states"):
        await db[col].delete_many({})

    await db.merchants.insert_many(merchants)
    await db.vouches.insert_many(vouches)
    await db.behavior_events.insert_many(events)

    logger.info(
        "Seeded: %d merchants (%d anchors), %d vouches, %d behavior events",
        len(merchants),
        sum(1 for m in merchants if m["is_anchor"]),
        len(vouches),
        len(events),
    )
    print(
        f"Seeded {len(merchants)} merchants, {len(vouches)} vouches, "
        f"{len(events)} behavior events into 'bharosa'."
    )
    print("Demo merchants: sita_tea_shop, good_merchant, seasonal_farmer, fraud_target")
    await close_mongo()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
