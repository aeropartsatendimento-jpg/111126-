"""Morning routine — briefing (real weather search + Zero), settings and history."""

from fastapi import APIRouter

from lib.db import db
from lib.orchestrator import run_briefing
from lib.scheduler import briefing_settings
from models.models import Briefing, BriefingSettingsIn, BriefingSettingsOut, aware

router = APIRouter()


@router.get("/briefing", response_model=list[Briefing])
async def list_briefings():
    docs = await db.briefings.find().sort("created_at", -1).to_list(10)
    return [Briefing(**{**doc, "created_at": aware(doc["created_at"])}) for doc in docs]


@router.get("/briefing/settings", response_model=BriefingSettingsOut)
async def read_settings():
    return BriefingSettingsOut(**await briefing_settings())


@router.patch("/briefing/settings", response_model=BriefingSettingsOut)
async def update_settings(input: BriefingSettingsIn):
    update = {k: v for k, v in input.model_dump().items() if v is not None}
    if update:
        await db.settings.update_one(
            {"key": "briefing"},
            {"$set": update, "$setOnInsert": {"key": "briefing"}},
            upsert=True,
        )
    return BriefingSettingsOut(**await briefing_settings())


@router.post("/briefing/run", response_model=Briefing)
async def run_now():
    return await run_briefing(await briefing_settings())
