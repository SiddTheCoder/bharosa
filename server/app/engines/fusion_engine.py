"""T5 — Fusion: the Bayesian trust brain.

Models P(repayment) as a Beta(alpha, beta) belief. Every Evidence item is a
weighted pseudo-count. Posterior mean -> score; posterior spread -> confidence;
conservative lower bound (p5) -> a safe recommended loan. Missing data is
handled natively: no evidence -> prior -> wide band -> low confidence.
"""
from __future__ import annotations

from datetime import datetime

from scipy.stats import beta as beta_dist

from app.db.mongo import get_db
from app.engines.behavior_engine import behavioral_evidence
from app.engines.graph_engine import social_evidence
from app.engines.relationships_engine import merchant_relationships, relationship_evidence
from app.engines.seasonality import merchant_season, repayment_schedule, schedule_note
from app.models.schemas import Evidence

PRIOR_ALPHA = 2.0
PRIOR_BETA = 3.0
LOAN_CEILING_NPR = 200_000
SCORE_MAX = 1000           # trust score scale: 0 (no trust) .. 1000 (fully trusted)


def fold_evidence(
    evidence: list[Evidence], a0: float = PRIOR_ALPHA, b0: float = PRIOR_BETA
) -> tuple[float, float]:
    alpha, beta = a0, b0
    for e in evidence:
        pos = max(e.value, 0.0)
        neg = max(-e.value, 0.0)
        alpha += e.reliability * e.k * pos
        beta += e.reliability * e.k * neg
    return alpha, beta


def posterior_stats(alpha: float, beta: float) -> dict:
    mean = alpha / (alpha + beta)
    p5 = float(beta_dist.ppf(0.05, alpha, beta))
    p95 = float(beta_dist.ppf(0.95, alpha, beta))
    score = round(mean * SCORE_MAX)              # 0..1000
    confidence = round((1 - (p95 - p5)) * 100)
    recommended_loan = int(LOAN_CEILING_NPR * p5)
    return {
        "mean": mean,
        "p5": p5,
        "p95": p95,
        "score": score,
        "confidence": confidence,
        "recommended_loan": recommended_loan,
    }


async def _psychometric_evidence(merchant_id: str) -> list[Evidence]:
    db = get_db()
    answers = await db.psychometric_answers.find({"merchant_id": merchant_id}).to_list(None)
    evidence: list[Evidence] = []
    for a in answers:
        evidence.append(Evidence(
            source="psychometric",
            label=f"{a['trait'].replace('_', ' ')} response",
            value=2 * float(a["score"]) - 1,
            reliability=float(a.get("reliability", 0.5)),
            k=1.0,
            action_type="interview",
        ))
    return evidence


async def _gather_evidence(merchant_id: str) -> tuple[list[Evidence], dict]:
    behavior = await behavioral_evidence(merchant_id)
    social, fraud_report = await social_evidence(merchant_id)
    psycho = await _psychometric_evidence(merchant_id)
    relationships = await relationship_evidence(merchant_id)
    return behavior + social + psycho + relationships, fraud_report


async def _trust_result(merchant_id: str, alpha: float, beta: float,
                        evidence: list[Evidence], fraud_report: dict) -> dict:
    stats = posterior_stats(alpha, beta)
    season = await merchant_season(merchant_id)
    note = schedule_note(season)
    schedule = repayment_schedule(season["cashflow"], stats["recommended_loan"])
    relationships = await merchant_relationships(merchant_id)
    return {
        "merchant_id": merchant_id,
        "score": stats["score"],
        "mean": round(stats["mean"], 4),
        "confidence": stats["confidence"],
        "p5": round(stats["p5"], 4),
        "p95": round(stats["p95"], 4),
        "recommended_loan": stats["recommended_loan"],
        "fraud_risk": "HIGH" if fraud_report.get("in_ring") else "LOW",
        "schedule_note": note,
        # Per-month cash-flow profile (boom/neutral/lean) + harvest-weighted plan,
        # ready for the dashboard's per-month bar graph and the lender view.
        "cashflow": season["cashflow"],
        "season": {
            "seasonal": season["seasonal"],
            "predictability": round(season["predictability"], 2),
            "stability": round(season["stability"], 2),
            "peak_months": season["peak_months"],
            "lean_months": season["lean_months"],
            "period_months": season["period_months"],
        },
        "loan": {
            "amount_npr": stats["recommended_loan"],
            "schedule_note": note,
            "schedule": schedule,
        },
        # Commerce relationships: repeat customers, supplier ties, concentration.
        "relationships": relationships,
        "evidence": [
            {"label": e.label, "value": round(e.value, 3), "source": e.source,
             "action_type": e.action_type}
            for e in evidence
        ],
    }


async def _persist(merchant_id: str, alpha: float, beta: float,
                   evidence: list[Evidence]) -> None:
    db = get_db()
    await db.trust_states.update_one(
        {"merchant_id": merchant_id},
        {"$set": {
            "merchant_id": merchant_id,
            "alpha": alpha,
            "beta": beta,
            "evidence_log": [e.to_dict() for e in evidence],
            "updated_at": datetime.utcnow(),
        }},
        upsert=True,
    )


async def compute_trust(merchant_id: str) -> dict:
    """Full recompute from all current evidence; persists and returns TrustResult."""
    evidence, fraud_report = await _gather_evidence(merchant_id)
    alpha, beta = fold_evidence(evidence)
    await _persist(merchant_id, alpha, beta, evidence)
    return await _trust_result(merchant_id, alpha, beta, evidence, fraud_report)


async def apply_event(merchant_id: str, evidence: list[Evidence]) -> dict:
    """Incremental update: fold new evidence onto the stored posterior."""
    db = get_db()
    state = await db.trust_states.find_one({"merchant_id": merchant_id})
    if state is None:
        await compute_trust(merchant_id)
        state = await db.trust_states.find_one({"merchant_id": merchant_id})

    a0, b0 = float(state["alpha"]), float(state["beta"])
    alpha, beta = fold_evidence(evidence, a0=a0, b0=b0)

    prior_log = state.get("evidence_log", [])
    new_log = prior_log + [e.to_dict() for e in evidence]
    await db.trust_states.update_one(
        {"merchant_id": merchant_id},
        {"$set": {
            "alpha": alpha,
            "beta": beta,
            "evidence_log": new_log,
            "updated_at": datetime.utcnow(),
        }},
    )

    all_evidence = [Evidence.from_dict(d) for d in new_log]
    _, fraud_report = await social_evidence(merchant_id)
    return await _trust_result(merchant_id, alpha, beta, all_evidence, fraud_report)
