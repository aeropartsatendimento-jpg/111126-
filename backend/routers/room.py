"""Shared room — the all-hands stream where the squad talks."""

import asyncio

from fastapi import APIRouter

from lib.db import db
from lib.orchestrator import zero_reply_in_room
from models.models import RoomMessage, RoomMessageCreate, aware

router = APIRouter()


@router.get("/room/messages", response_model=list[RoomMessage])
async def list_messages():
    docs = await db.room_messages.find().sort("created_at", -1).to_list(200)
    docs.reverse()  # chronological for the stream
    return [RoomMessage(**{**doc, "created_at": aware(doc["created_at"])}) for doc in docs]


@router.post("/room/messages", response_model=RoomMessage)
async def post_message(input: RoomMessageCreate):
    message = RoomMessage(sender_key="user", kind="chat", content=input.content)
    await db.room_messages.insert_one(message.model_dump())
    asyncio.create_task(zero_reply_in_room())
    return message
