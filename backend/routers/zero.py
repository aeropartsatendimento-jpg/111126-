"""Zero's dedicated direct line — 1-a-1 chat with intent (explicando/propondo/executando)."""

import logging
import uuid

from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from lib.db import db
from lib.orchestrator import remember, spawn, start_mission, zero_direct_reply
from models.models import DirectMessage, ZeroChatCreate, aware

router = APIRouter()
logger = logging.getLogger(__name__)


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
    await db.zero_messages.insert_one({**message.model_dump(), "reply_status": "pending"})
    spawn(zero_direct_reply(message.id))
    return message


@router.post("/zero/messages/{mid}/execute", response_model=DirectMessage)
async def execute_proposal(mid: str):
    """The Chefe approves a proposal → it becomes a real mission."""
    reserved_mission_id = str(uuid.uuid4())
    doc = await db.zero_messages.find_one_and_update(
        {
            "id": mid,
            "intent": "propondo",
            "proposal": {"$type": "string", "$ne": ""},
            "$or": [{"mission_id": None}, {"mission_id": {"$exists": False}}],
        },
        {"$set": {"mission_id": reserved_mission_id}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        existing = await db.zero_messages.find_one({"id": mid})
        if not existing:
            raise HTTPException(status_code=404, detail="message not found")
        if existing.get("mission_id"):
            raise HTTPException(status_code=409, detail="proposal already executed")
        raise HTTPException(status_code=409, detail="message is not a pending proposal")

    try:
        await start_mission(doc["proposal"], doc.get("project_id"), mission_id=reserved_mission_id)
    except Exception:
        await db.zero_messages.update_one(
            {"id": mid, "mission_id": reserved_mission_id},
            {"$set": {"mission_id": None}},
        )
        raise

    try:
        await remember(
            "decisao_chefe",
            doc["proposal"][:120],
            doc["proposal"],
            "Proposta do Zero aprovada pelo Chefe",
            doc.get("project_id"),
            memory_id=f"proposal-{mid}",
        )
    except Exception:
        logger.exception("proposal %s executed but decision memory could not be recorded", mid)
    return to_msg(doc)
