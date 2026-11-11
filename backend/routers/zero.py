"""Zero's dedicated direct line — 1-a-1 chat with the main AI."""

import asyncio

from fastapi import APIRouter

from lib.db import db
from lib.orchestrator import zero_direct_reply
from models.models import DirectMessage, ZeroChatCreate, aware

router = APIRouter()


@router.get("/zero/messages", response_model=list[DirectMessage])
async def list_messages():
    docs = await db.zero_messages.find().sort("created_at", -1).to_list(200)
    docs.reverse()
    return [DirectMessage(**{**doc, "created_at": aware(doc["created_at"])}) for doc in docs]


@router.post("/zero/chat", response_model=DirectMessage)
async def send_chat(input: ZeroChatCreate):
    message = DirectMessage(role="user", content=input.content)
    await db.zero_messages.insert_one(message.model_dump())
    asyncio.create_task(zero_direct_reply())
    return message
