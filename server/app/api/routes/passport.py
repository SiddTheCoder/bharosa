"""Passport + explain read endpoints."""
from fastapi import APIRouter

from app.engines.explainer import explain
from app.services.passport_service import build_passport

router = APIRouter()


@router.get("/merchant/{merchant_id}/passport")
async def get_passport(merchant_id: str):
    return await build_passport(merchant_id)


@router.get("/merchant/{merchant_id}/explain")
async def get_explain(merchant_id: str):
    return await explain(merchant_id)
