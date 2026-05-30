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
    kind: Literal[
        "electricity", "water", "internet", "airtime",
        "qr_revenue",        # incoming customer payment
        "supplier_payment",  # outgoing payment to a supplier
    ]
    date: datetime
    amount: int                              # NPR
    on_time: Optional[bool] = None           # for bills
    due_date: Optional[datetime] = None      # for bills
    # Commerce-relationship fields (qr_revenue / supplier_payment):
    counterparty: Optional[str] = None       # stable id/token for the other party
    counterparty_name: Optional[str] = None  # display name, if known
    direction: Optional[Literal["in", "out"]] = None  # in = customer paid; out = paid supplier


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


KycStatus = Literal["unverified", "pending", "verified", "rejected"]


class User(BaseModel):
    uid: str                                  # Firebase UID (unique index)
    provider: Literal["google", "phone", "unknown"] = "unknown"
    email: Optional[str] = None
    phone: Optional[str] = None
    name: Optional[str] = None
    photo_url: Optional[str] = None
    merchant_id: str                          # FK → merchants.id (the user's engine subject)
    kyc_status: KycStatus = "unverified"
    created_at: datetime
    last_seen_at: datetime


class KycSubmission(BaseModel):
    id: str
    uid: str                                  # owner
    doc_type: Literal["citizenship", "nid", "pan", "passport", "license"]
    claimed: dict = Field(default_factory=dict)      # { name, dob, id_number } the user typed
    extracted: dict = Field(default_factory=dict)    # OCR fields the model read off the document
    checks: dict = Field(default_factory=dict)       # per-stage results
    confidence: float = 0.0                          # 0..1 overall
    decision: Literal["pending", "verified", "rejected"] = "pending"
    reasons: list[str] = Field(default_factory=list)
    doc_uris: list[str] = Field(default_factory=list)
    selfie_uri: Optional[str] = None
    created_at: datetime


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
