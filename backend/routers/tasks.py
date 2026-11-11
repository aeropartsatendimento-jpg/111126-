"""Task queue — per-agent tasks with status and result."""

from typing import Optional

from fastapi import APIRouter

from lib.db import db
from models.models import Task, aware

router = APIRouter()


@router.get("/tasks", response_model=list[Task])
async def list_tasks(agent_key: Optional[str] = None, status: Optional[str] = None, mission_id: Optional[str] = None):
    query: dict = {}
    if agent_key:
        query["agent_key"] = agent_key
    if status:
        query["status"] = status
    if mission_id:
        query["mission_id"] = mission_id

    docs = await db.tasks.find(query).sort("created_at", -1).to_list(200)
    return [Task(**{**doc, "created_at": aware(doc["created_at"]), "updated_at": aware(doc["updated_at"])}) for doc in docs]
