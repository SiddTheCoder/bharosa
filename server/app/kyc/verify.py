"""T22 — In-house AI KYC verification.

Honest by design: this proves *document plausibility + face-match*, not
authoritative government identity. It emits a confidence and one of three
decisions — `verified` (auto), `pending` (manual review), `rejected` — with
human-readable reasons. The gray zone is routed to manual review exactly the way
production KYC systems hand off to a human.

Stages (each contributes to a weighted confidence; hard signals force a floor):
  1. Document classification + OCR (vision)
  2. Format / shape validation of the ID number
  3. Field consistency (claimed name/DOB vs OCR, + Firebase display name)
  4. Face match + liveness (vision: ID photo vs selfie)
  5. Tamper / quality heuristics (from the vision quality flags)
"""
from __future__ import annotations

import logging
import re
from difflib import SequenceMatcher
from typing import Optional

from app.kyc.vision import vision_available, vision_json

logger = logging.getLogger(__name__)

# Lenient shape checks — Nepal ID formats vary, so a miss is a soft penalty, not
# an automatic hard fail (handled in the decision engine below).
ID_PATTERNS: dict[str, str] = {
    "pan": r"^\d{9}$",
    "citizenship": r"^[\d][\d\-/ ]{4,24}$",
    "nid": r"^[\d\-\s]{9,20}$",
    "passport": r"^[A-Z]{1,2}\d{6,8}$",
    "license": r"^[A-Z0-9\-]{5,20}$",
}

OCR_PROMPT = (
    "You are a KYC document analyst. Look at the identity document image(s) and "
    "return STRICT JSON only (no prose, no markdown):\n"
    '{"is_identity_document": <bool>, "doc_type": '
    '"citizenship|nid|pan|passport|license|unknown", "name": "<full name or empty>", '
    '"name_romanized": "<full name transliterated to Latin/English letters, or empty>", '
    '"dob": "<date of birth exactly as written on the document, or empty>", '
    '"dob_gregorian": "<date of birth normalized to Gregorian ISO YYYY-MM-DD, or empty>", '
    '"id_number": "<id/document number or empty>", '
    '"issuer": "<issuing authority or empty>", "has_photo": <bool>, '
    '"quality": {"blurry": <bool>, "glare": <bool>, "screenshot_or_screen": <bool>, '
    '"tamper_signs": <bool>}}\n'
    "Read `name` and `dob` exactly as printed (keep the original script, e.g. Devanagari). "
    "For `name_romanized`, transliterate that same name into Latin letters. "
    "For `dob_gregorian`, convert the printed date to the Gregorian (AD) calendar in "
    "YYYY-MM-DD form. IMPORTANT: many Nepali documents print the date in the Bikram "
    "Sambat (BS) calendar, which runs ~56-57 years ahead of AD (e.g. BS 2064-04-13 = "
    "AD 2007-07-29). If the document uses BS, convert it to AD; if it is already "
    "Gregorian, keep it as-is.\n"
    "screenshot_or_screen = true if this looks like a photo of a screen / a screen "
    "recapture rather than a photo of a physical document."
)

FACE_PROMPT = (
    "You are a face-verification analyst. The FIRST image is a face cropped from "
    "an ID document; the SECOND image is a selfie of the person presenting it. "
    "Return STRICT JSON only:\n"
    '{"same_person": <bool>, "match_confidence": <0..1>, '
    '"selfie_is_live_capture": <bool>, "selfie_quality_ok": <bool>, '
    '"notes": "<one short sentence>"}\n'
    "selfie_is_live_capture = false if the selfie looks like a photo of another "
    "photo / a screen / a printout. Judge identity by facial structure, not background."
)


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _name_similarity(a: str, b: str) -> float:
    a, b = _norm(a), _norm(b)
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def _digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def _dob_match(claimed: str, extracted: str) -> bool:
    cd, ed = _digits(claimed), _digits(extracted)
    if not cd or not ed:
        return False
    # Same multiset of digits (handles DD/MM/YYYY vs YYYY-MM-DD reorderings).
    return sorted(cd) == sorted(ed) or cd == ed


def _format_ok(doc_type: str, id_number: str) -> bool:
    pattern = ID_PATTERNS.get(doc_type)
    if not pattern or not id_number:
        return False
    return re.match(pattern, id_number.strip().upper()) is not None


def _decide(confidence: float, hard_fail: bool, soft_flag: bool) -> str:
    if hard_fail:
        return "rejected"
    if confidence >= 0.80 and not soft_flag:
        return "verified"
    if confidence >= 0.50:
        return "pending"
    return "rejected"


async def verify_submission(
    doc_type: str,
    claimed: dict,
    doc_images: list[tuple[bytes, str]],
    selfie: Optional[tuple[bytes, str]],
    *,
    firebase_name: Optional[str] = None,
    selfie_uploaded: bool = False,
) -> dict:
    """Run the pipeline. Returns {decision, confidence, checks, reasons, extracted}."""
    checks: dict = {}
    reasons: list[str] = []
    extracted: dict = {}

    if not vision_available():
        # No vision backend → cannot verify automatically; hand to manual review.
        return {
            "decision": "pending",
            "confidence": 0.0,
            "checks": {"vision_available": False},
            "reasons": ["Automated vision check unavailable — queued for manual review."],
            "extracted": {},
        }

    # ── Stage 1: classification + OCR ──────────────────────────────────────
    ocr = await vision_json(OCR_PROMPT, doc_images) or {}
    extracted = {
        "doc_type": ocr.get("doc_type", "unknown"),
        "name": ocr.get("name", ""),
        "name_romanized": ocr.get("name_romanized", ""),
        "dob": ocr.get("dob", ""),
        "dob_gregorian": ocr.get("dob_gregorian", ""),
        "id_number": ocr.get("id_number", ""),
        "issuer": ocr.get("issuer", ""),
    }
    quality = ocr.get("quality") or {}
    is_id = bool(ocr.get("is_identity_document", False))
    checks["is_identity_document"] = is_id

    hard_fail = False
    soft_flag = False

    if not is_id:
        reasons.append("Uploaded image does not appear to be an identity document.")
        hard_fail = True

    detected_type = (ocr.get("doc_type") or "unknown").lower()
    checks["doc_type_match"] = (detected_type == doc_type) or detected_type == "unknown"
    if detected_type not in ("unknown", doc_type):
        reasons.append(f"Document looks like a {detected_type}, but {doc_type} was selected.")
        soft_flag = True

    # ── Stage 2: format / shape validation ────────────────────────────────
    fmt_ok = _format_ok(doc_type, extracted["id_number"])
    checks["format_ok"] = fmt_ok
    if not fmt_ok:
        reasons.append(f"ID number does not match the expected {doc_type} format.")
        soft_flag = True

    # ── Stage 3: field consistency ─────────────────────────────────────────
    name_sources = [claimed.get("name", "")]
    if firebase_name:
        name_sources.append(firebase_name)
    # Compare the claimed name against both the raw (original-script) and the
    # romanized document name, so a Devanagari ID still matches a Latin-typed name.
    doc_names = [n for n in (extracted["name"], extracted["name_romanized"]) if n]
    name_match = max(
        (_name_similarity(dn, n) for dn in doc_names for n in name_sources),
        default=0.0,
    )
    checks["name_match"] = round(name_match, 3)
    if name_match < 0.35:
        reasons.append("Name on the document does not match the name provided.")
        hard_fail = True
    elif name_match < 0.6:
        reasons.append("Name on the document only partially matches the name provided.")
        soft_flag = True

    # Match against the date as written AND the Gregorian-normalized date, so a
    # Bikram Sambat (Nepali calendar) DOB matches a claimed AD date.
    dob_ok = _dob_match(claimed.get("dob", ""), extracted["dob"]) or _dob_match(
        claimed.get("dob", ""), extracted["dob_gregorian"]
    )
    checks["dob_match"] = dob_ok
    if claimed.get("dob") and not dob_ok:
        reasons.append("Date of birth does not match the document.")
        soft_flag = True

    # ── Stage 4: face match + liveness ─────────────────────────────────────
    face_match = 0.0
    liveness = 0.0
    if selfie is not None and doc_images:
        face = await vision_json(FACE_PROMPT, [doc_images[0], selfie]) or {}
        face_match = float(face.get("match_confidence", 0.0) or 0.0)
        same = bool(face.get("same_person", False))
        live = bool(face.get("selfie_is_live_capture", False))
        liveness = 0.9 if live else 0.5
        # An uploaded still is allowed but weighed slightly lower; never auto-rejected for that alone.
        if selfie_uploaded:
            liveness = min(liveness, 0.7)
        checks["face_match"] = round(face_match, 3)
        checks["liveness"] = round(liveness, 3)
        checks["same_person"] = same
        if not same or face_match < 0.45:
            reasons.append("Face on the document does not convincingly match the selfie.")
            soft_flag = True
        if face_match < 0.2:
            reasons.append("Face mismatch between document and selfie.")
            hard_fail = True
    else:
        reasons.append("No selfie provided for face match.")
        checks["face_match"] = 0.0
        checks["liveness"] = 0.0
        soft_flag = True

    # ── Stage 5: tamper / quality ──────────────────────────────────────────
    tamper = bool(quality.get("tamper_signs") or quality.get("screenshot_or_screen"))
    checks["tamper_detected"] = tamper
    checks["quality"] = quality
    if quality.get("screenshot_or_screen"):
        reasons.append("Document looks like a screen recapture / screenshot.")
        soft_flag = True
    if quality.get("tamper_signs"):
        reasons.append("Possible tampering detected on the document.")
        soft_flag = True

    # ── Decision engine: weighted blend ────────────────────────────────────
    confidence = (
        0.30 * name_match
        + 0.15 * (1.0 if dob_ok else 0.0)
        + 0.30 * face_match
        + 0.10 * liveness
        + 0.10 * (1.0 if fmt_ok else 0.0)
        + 0.05 * (1.0 if checks["doc_type_match"] else 0.0)
    )
    if tamper:
        confidence *= 0.7  # tamper signal caps confidence into the review band
    confidence = round(max(0.0, min(1.0, confidence)), 3)

    decision = _decide(confidence, hard_fail, soft_flag)
    if decision == "verified":
        reasons.insert(0, "Document and selfie passed all automated checks.")
    elif decision == "pending":
        reasons.insert(0, "Submitted for manual review (automated confidence in the gray zone).")

    return {
        "decision": decision,
        "confidence": confidence,
        "checks": checks,
        "reasons": reasons,
        "extracted": extracted,
    }
