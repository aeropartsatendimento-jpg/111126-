"""Missions — the Chefe dispatches to Zero, the engine takes it from there."""

import asyncio

from fastapi import APIRouter

from lib.db import db
from lib.orchestrator import run_mission
from models.models import Mission, MissionCreate, aware

router = APIRouter()


@router.post("/missions", response_model=Mission)
async def create_mission(input: MissionCreate):
    mission = Mission(text=input.text, status="planning")
    await db.missions.insert_one(mission.model_dump())
    # Background engine: the POST returns immediately, the room tells the story.
    asyncio.create_task(run_mission(mission.id))
    return mission


@router.get("/missions", response_model=list[Mission])
async def list_missions():
    docs = await db.missions.find().sort("created_at", -1).to_list(30)
    return [Mission(**{**doc, "created_at": aware(doc["created_at"])}) for doc in docs]
