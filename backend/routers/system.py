"""Tiny system-info endpoint — the UI's brain-status pill reads this."""

from fastapi import APIRouter

from lib.brain import llm_configured
from models.models import SystemInfo

router = APIRouter()


@router.get("/system", response_model=SystemInfo)
async def system_info():
    configured = llm_configured()
    return SystemInfo(app="QG do Zero", llm_configured=configured, brain="cloud" if configured else "simulated")
