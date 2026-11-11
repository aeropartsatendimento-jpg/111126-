"""Agent registry — the five-I hierarchy, read-only for now."""

from fastapi import APIRouter

from models.models import Agent, aware
from lib.db import db

router = APIRouter()

WORKING_SET = {"status": {"$in": ["queued", "working"]}}


@router.get("/agents", response_model=list[Agent])
async def list_agents():
    agents = await db.agents.find().sort("created_at", 1).to_list(50)

    open_counts: dict[str, int] = {}
    working_keys: set[str] = set()
    async for doc in db.tasks.aggregate(
        [
            {"$match": WORKING_SET},
            {"$group": {"_id": "$agent_key", "n": {"$sum": 1}, "working": {"$sum": {"$cond": [{"$eq": ["$status", "working"]}, 1, 0]}}}},
        ]
    ):
        open_counts[doc["_id"]] = doc["n"]
        if doc["working"]:
            working_keys.add(doc["_id"])

    out: list[Agent] = []
    for doc in agents:
        doc["created_at"] = aware(doc["created_at"])
        doc["open_tasks"] = open_counts.get(doc["key"], 0)
        doc["status"] = "working" if doc["key"] in working_keys else "idle"
        out.append(Agent(**doc))
    return out
