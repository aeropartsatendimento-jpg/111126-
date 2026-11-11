"""Zero's dedicated direct line — 1-a-1 chat with intent (explicando/propondo/executando)."""

import asyncio

from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.orchestrator import start_mission, zero_direct_reply
from models.models import DirectMessage, ZeroChatCreate, aware

router = APIRouter()


def to_msg(doc: dict) -> DirectMessage:
    return DirectMessage(**{**doc, "created_at": aware(doc["created_at"])})


@router.get("/zero/messages", response_model=list[DirectMessage])
async def list_messages():
    docs = await db.zero_messages.find().sort("created_at", -1).to_list(200)
    docs.reverse()
    return [to_msg(doc) for doc in docs]


@router.post("/zero/chat", response_model=DirectMessage)
async def send_chat(input: ZeroChatCreate):
    message = DirectMessage(role="user", content=input.content)
    await db.zero_messages.insert_one(message.model_dump())
    asyncio.create_task(zero_direct_reply())
    return message


@router.post("/zero/messages/{mid}/execute", response_model=DirectMessage)
async def execute_proposal(mid: str):
    """The Chefe approves a proposal → it becomes a real mission."""
    doc = await db.zero_messages.find_one({"id": mid})
    if not doc:
        raise HTTPException(status_code=404, detail="message not found")
    if doc.get("intent") != "propondo" or not doc.get("proposal"):
        raise HTTPException(status_code=409, detail="message is not a pending proposal")
    if doc.get("mission_id"):
        raise HTTPException(status_code=409, detail="proposal already executed")
    mission = await start_mission(doc["proposal"], doc.get("project_id"))
    await db.zero_messages.update_one({"id": mid}, {"$set": {"mission_id": mission["id"]}})
    doc["mission_id"] = mission["id"]
    return to_msg(doc)
