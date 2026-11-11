"""Task queue — per-agent tasks with status, result and the Chefe's review."""

from typing import Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.orchestrator import review_task
from models.models import Task, TaskReview, aware

router = APIRouter()


def to_task(doc: dict) -> Task:
    return Task(**{**doc, "created_at": aware(doc["created_at"]), "updated_at": aware(doc["updated_at"])})


@router.get("/tasks", response_model=list[Task])
async def list_tasks(agent_key: Optional[str] = None, status: Optional[str] = None, mission_id: Optional[str] = None, project_id: Optional[str] = None):
    query: dict = {}
    if agent_key:
        query["agent_key"] = agent_key
    if status:
        query["status"] = status
    if mission_id:
        query["mission_id"] = mission_id
    if project_id:
        query["project_id"] = project_id
    docs = await db.tasks.find(query).sort("created_at", -1).to_list(200)
    return [to_task(doc) for doc in docs]


@router.patch("/tasks/{tid}/review", response_model=Task)
async def review(tid: str, input: TaskReview):
    doc = await db.tasks.find_one({"id": tid})
    if not doc:
        raise HTTPException(status_code=404, detail="task not found")
    if doc["status"] != "review":
        raise HTTPException(status_code=409, detail="task is not awaiting review")
    return to_task(await review_task(doc, input.approve, input.note))
