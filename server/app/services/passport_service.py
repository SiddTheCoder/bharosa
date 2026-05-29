"""Builds the full Credit Passport (TrustResult + explanation) in one compute."""
from app.db.mongo import get_db
from app.engines.explainer import explanation_for
from app.engines.fusion_engine import compute_trust


async def build_passport(merchant_id: str) -> dict:
    result = await compute_trust(merchant_id)          # persists alpha/beta
    db = get_db()
    state = await db.trust_states.find_one({"merchant_id": merchant_id})
    alpha = float(state["alpha"]) if state else 2.0
    beta = float(state["beta"]) if state else 3.0
    explanation = await explanation_for(result, alpha, beta)
    return {**result, **explanation}
