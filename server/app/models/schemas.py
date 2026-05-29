"""Data models — Pydantic documents (Mongo) + the shared Evidence dataclass.

Mongo collections: merchants, vouches, behavior_events, psychometric_answers, trust_states.
Every engine speaks one currency: a list of `Evidence` objects.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ───────────────────────────── Mongo documents ─────────────────────────────

class Merchant(BaseModel):
    id: str                       # uuid
    name: str
    business_type: str            # "tea_shop" | "vegetable" | "farmer" | "vendor" | ...
    is_anchor: bool = False       # verified seed node for trust propagation
    created_at: datetime


class Vouch(BaseModel):
    id: str
    from_id: str                  # voucher
    to_id: str                    # vouchee
    kind: Literal["vouch", "guarantee"]
    created_at: datetime


class BehaviorEvent(BaseModel):
    id: str
    merchant_id: str
    kind: Literal["electricity", "water", "internet", "airtime", "qr_revenue"]
    date: datetime
    amount: int                              # NPR
    on_time: Optional[bool] = None           # for bills
    due_date: Optional[datetime] = None      # for bills


class PsychometricAnswer(BaseModel):
    id: str
    merchant_id: str
    question_id: str
    trait: Literal["conscientiousness", "risk_aversion"]
    transcript: str
    score: float                  # 0..1 (1 = favorable)
    reliability: float            # 0..1


class TrustState(BaseModel):
    merchant_id: str
    alpha: float
    beta: float
    evidence_log: list[dict] = Field(default_factory=list)   # serialized Evidence items
    updated_at: datetime


# ───────────────────────────── Shared currency ─────────────────────────────

@dataclass
class Evidence:
    source: Literal["behavior", "social", "psychometric"]
    label: str                    # human-readable, e.g. "11/12 on-time electricity bills"
    value: float                  # -1.0..1.0  (positive = creditworthy signal)
    reliability: float            # 0.0..1.0   (how trustworthy is this signal)
    k: float                      # pseudo-count scale (observations this is worth)
    action_type: Optional[str] = None  # "bill" | "vouch" | "interview" | "qr" ...

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Evidence":
        return cls(**d)
