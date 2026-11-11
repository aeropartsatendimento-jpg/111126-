"""Missions — the Chefe dispatches to Zero, the engine takes it from there."""

from fastapi import APIRouter

from lib.db import db
from lib.orchestrator import start_mission
from models.models import Mission, MissionCreate, aware

router = APIRouter()


@router.post("/missions", response_model=Mission)
async def create_mission(input: MissionCreate):
    doc = await start_mission(input.text, input.project_id)
    return Mission(**doc)


@router.get("/missions", response_model=list[Mission])
async def list_missions():
    docs = await db.missions.find().sort("created_at", -1).to_list(30)
    return [Mission(**{**doc, "created_at": aware(doc["created_at"])}) for doc in docs]
