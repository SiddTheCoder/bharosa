"""T6 — Counterfactual explainer.

The lender screen shows a *path*, not just a verdict. Given the current
Beta(alpha, beta) belief and the next tier threshold, we compute the minimal
extra positive evidence (delta-alpha) needed to cross it — literally the inverse
of the scoring function — and translate it into concrete human actions.
"""
from __future__ import annotations

import logging
import math

from app.db.mongo import get_db
from app.engines.fusion_engine import compute_trust
from app.llm import llm_chat

logger = logging.getLogger(__name__)

# Thresholds on the posterior mean.
TIERS = {"starter": 0.45, "growth": 0.65, "established": 0.80}

# Per-action pseudo-count contribution (approx reliability*k*value for a good action).
K_BILL = 1.0
K_VOUCH = 2.0


def next_tier_target(mean: float) -> tuple[str, float] | None:
    """Smallest tier whose threshold is strictly above the current mean."""
    for name, threshold in sorted(TIERS.items(), key=lambda kv: kv[1]):
        if mean < threshold:
            return name, threshold
    return None


def evidence_delta_to(target_mean: float, alpha: float, beta: float) -> float:
    """Extra alpha needed so alpha'/(alpha'+beta) == target_mean (beta held)."""
    if target_mean >= 1.0:
        return float("inf")
    alpha_needed = target_mean * beta / (1 - target_mean)
    return max(alpha_needed - alpha, 0.0)


def actions_for_delta(delta_alpha: float) -> list[str]:
    if delta_alpha <= 0:
        return []
    n_bills = math.ceil(delta_alpha / K_BILL)
    n_vouches = math.ceil(delta_alpha / K_VOUCH)
    bill_word = "bill" if n_bills == 1 else "bills"
    vouch_word = "trusted business" if n_vouches == 1 else "trusted businesses"
    return [
        f"Pay {n_bills} more {bill_word} on time (like electricity or water)",
        f"Or get {n_vouches} more {vouch_word} to vouch for you",
    ]


async def explanation_for(result: dict, alpha: float, beta: float) -> dict:
    """Build {why, next_steps} from an already-computed TrustResult + posterior."""
    mean = alpha / (alpha + beta)
    target = next_tier_target(mean)
    if target is None:
        next_steps = ["You're at the top level — just keep paying on time and staying active."]
    else:
        _, threshold = target
        next_steps = actions_for_delta(evidence_delta_to(threshold, alpha, beta))
    why = await _render_why(result, target, next_steps)
    return {"why": why, "next_steps": next_steps}


async def explain(merchant_id: str) -> dict:
    """Return {"why": <plain-language text>, "next_steps": [...]}."""
    result = await compute_trust(merchant_id)  # refreshes + persists state
    db = get_db()
    state = await db.trust_states.find_one({"merchant_id": merchant_id})
    alpha = float(state["alpha"]) if state else 2.0
    beta = float(state["beta"]) if state else 3.0
    return await explanation_for(result, alpha, beta)


def _fallback_why(result: dict, target, next_steps: list[str]) -> str:
    reasons = ", ".join(e["label"] for e in result["evidence"]) or "no records yet"
    tier_txt = f" To reach the {target[0]} tier: {'; '.join(next_steps)}." if target else ""
    fraud_txt = " Fraud risk flagged." if result["fraud_risk"] == "HIGH" else ""
    return (
        f"Trust score {result['score']} with {result['confidence']}% confidence. "
        f"Based on: {reasons}.{fraud_txt}{tier_txt}"
    )


async def _render_why(result: dict, target, next_steps: list[str]) -> str:
    summary = "; ".join(
        f"{e['label']} ({e['value']:+.2f}, {e['source']})" for e in result["evidence"]
    ) or "no records yet"
    tier_line = (
        f"Next tier '{target[0]}' needs: {', '.join(next_steps)}."
        if target else "Already at the top tier."
    )
    prompt = [
        {
            "role": "system",
            "content": (
                "You explain a micro-merchant's credit trust score to a lender in 2-3 "
                "short, plain sentences. Be concrete, warm, and non-judgemental. "
                "Mention the confidence level and the single biggest driver. "
                "Do not invent facts beyond the evidence given. Output plain text only."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Score: {result['score']} (confidence {result['confidence']}%). "
                f"Fraud risk: {result['fraud_risk']}. "
                f"Recommended loan: Rs.{result['recommended_loan']}. "
                f"Evidence: {summary}. {tier_line}"
            ),
        },
    ]
    try:
        text, _provider = await llm_chat(prompt)
        text = (text or "").strip()
        if text:
            return text
    except Exception as e:  # boundary: LLM may be unavailable — never crash passport
        logger.warning("explain LLM render failed, using fallback: %s", e)
    return _fallback_why(result, target, next_steps)
