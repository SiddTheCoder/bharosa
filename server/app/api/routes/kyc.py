"""T21 — KYC submission + status. Accept documents + selfie, persist, verify.

Document/selfie images are stored privately in **GridFS** (inside MongoDB), not
on local disk or a public CDN. Each file is tagged with its owner `uid`; the
`doc_uris`/`selfie_uri` fields hold GridFS file ids. Retrieval is owner-scoped.

The selfie is source-agnostic: a live camera capture and an uploaded image take
the same face-match + liveness path. An uploaded still is only weighed slightly
lower on liveness (see `verify_submission(selfie_uploaded=...)`), never rejected
solely for being uploaded.
"""
import uuid
from datetime import datetime
from typing import Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.auth.deps import get_current_user
from app.db.mongo import get_db, get_gridfs_bucket
from app.kyc.verify import verify_submission
from app.models.schemas import User

router = APIRouter(prefix="/kyc")

DocType = Literal["citizenship", "nid", "pan", "passport", "license"]
_ALLOWED_MIME = {"image/jpeg", "image/png", "image/jpg", "image/webp"}


async def _save(uid: str, sub_id: str, kind: str, idx: int, data: bytes, mime: str) -> str:
    """Store one image in GridFS, tagged with owner uid. Returns the file id (str)."""
    bucket = get_gridfs_bucket()
    file_id = await bucket.upload_from_stream(
        f"{uid}/{sub_id}/{kind}_{idx}",
        data,
        metadata={"uid": uid, "submission_id": sub_id, "kind": kind, "mime": mime},
    )
    return str(file_id)


async def _read(f: UploadFile) -> tuple[bytes, str]:
    mime = (f.content_type or "image/jpeg").lower()
    if mime not in _ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"unsupported image type: {mime}")
    return await f.read(), mime


@router.post("/submit")
async def submit_kyc(
    doc_type: DocType = Form(...),
    name: str = Form(...),
    dob: str = Form(""),
    id_number: str = Form(""),
    document: list[UploadFile] = File(...),
    selfie: Optional[UploadFile] = File(None),
    selfie_source: Literal["camera", "upload"] = Form("camera"),
    user: User = Depends(get_current_user),
):
    if not document:
        raise HTTPException(status_code=400, detail="at least one document image is required")
    if len(document) > 2:
        raise HTTPException(status_code=400, detail="at most two document images")

    db = get_db()
    now = datetime.utcnow()
    sub_id = f"kyc_{uuid.uuid4().hex[:10]}"

    doc_images: list[tuple[bytes, str]] = []
    doc_uris: list[str] = []
    for i, f in enumerate(document):
        data, mime = await _read(f)
        doc_images.append((data, mime))
        doc_uris.append(await _save(user.uid, sub_id, "doc", i, data, mime))

    selfie_bytes: Optional[tuple[bytes, str]] = None
    selfie_uri: Optional[str] = None
    if selfie is not None:
        data, mime = await _read(selfie)
        selfie_bytes = (data, mime)
        selfie_uri = await _save(user.uid, sub_id, "selfie", 0, data, mime)

    claimed = {"name": name, "dob": dob, "id_number": id_number}

    # Persist a pending row + flip user status before running the (inline) pipeline.
    await db.kyc_submissions.insert_one({
        "id": sub_id, "uid": user.uid, "doc_type": doc_type, "claimed": claimed,
        "extracted": {}, "checks": {}, "confidence": 0.0, "decision": "pending",
        "reasons": [], "doc_uris": doc_uris, "selfie_uri": selfie_uri, "created_at": now,
    })
    await db.users.update_one({"uid": user.uid}, {"$set": {"kyc_status": "pending"}})

    result = await verify_submission(
        doc_type=doc_type,
        claimed=claimed,
        doc_images=doc_images,
        selfie=selfie_bytes,
        firebase_name=user.name,
        selfie_uploaded=(selfie_source == "upload"),
    )

    await db.kyc_submissions.update_one(
        {"id": sub_id},
        {"$set": {
            "extracted": result["extracted"], "checks": result["checks"],
            "confidence": result["confidence"], "decision": result["decision"],
            "reasons": result["reasons"],
        }},
    )

    # verified → unlock the app; rejected → reset to unverified so the user can retry; else pending.
    new_status = {"verified": "verified", "rejected": "unverified"}.get(result["decision"], "pending")
    await db.users.update_one({"uid": user.uid}, {"$set": {"kyc_status": new_status}})

    return {
        "submission_id": sub_id,
        "decision": result["decision"],
        "confidence": result["confidence"],
        "reasons": result["reasons"],
        "kyc_status": new_status,
    }


@router.get("/status")
async def kyc_status(user: User = Depends(get_current_user)):
    db = get_db()
    latest = await db.kyc_submissions.find_one(
        {"uid": user.uid}, sort=[("created_at", -1)],
    )
    out = {"kyc_status": user.kyc_status, "latest": None}
    if latest:
        out["latest"] = {
            "submission_id": latest["id"],
            "decision": latest["decision"],
            "confidence": latest["confidence"],
            "reasons": latest["reasons"],
            "doc_uris": latest.get("doc_uris", []),
            "selfie_uri": latest.get("selfie_uri"),
            "created_at": latest["created_at"].isoformat(),
        }
    return out


@router.get("/file/{file_id}")
async def get_kyc_file(file_id: str, user: User = Depends(get_current_user)):
    """Stream a stored KYC image. Owner-scoped: a user can only fetch their own files."""
    try:
        oid = ObjectId(file_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="invalid file id")

    bucket = get_gridfs_bucket()
    try:
        stream = await bucket.open_download_stream(oid)
    except Exception:
        raise HTTPException(status_code=404, detail="file not found")

    meta = stream.metadata or {}
    if meta.get("uid") != user.uid:
        raise HTTPException(status_code=403, detail="not your file")

    data = await stream.read()
    return Response(content=data, media_type=meta.get("mime", "image/jpeg"))
