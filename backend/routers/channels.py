"""External channels — WhatsApp / Facebook placeholders (configurable) and
the Internet channel with REAL web search (no API key, graceful fallback)."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.search import SEARCH_ENGINE, web_search
from models.models import Channel, ChannelUpdate, SearchCreate, SearchResponse, aware

router = APIRouter()


@router.get("/channels", response_model=list[Channel])
async def list_channels():
    docs = await db.channels.find().sort("created_at", 1).to_list(20)
    return [Channel(**{**doc, "updated_at": aware(doc["updated_at"])}) for doc in docs]


@router.patch("/channels/{cid}", response_model=Channel)
async def update_channel(cid: str, input: ChannelUpdate):
    doc = await db.channels.find_one({"id": cid})
    if not doc:
        raise HTTPException(status_code=404, detail="channel not found")

    update: dict = {"updated_at": datetime.now(timezone.utc)}
    if input.status is not None:
        if input.status not in ("connected", "disconnected"):
            raise HTTPException(status_code=422, detail="status must be connected|disconnected")
        update["status"] = input.status
    if input.config is not None:
        update["config"] = input.config

    await db.channels.update_one({"id": cid}, {"$set": update})
    doc.update(update)
    return Channel(**{**doc, "updated_at": aware(doc["updated_at"])})


@router.post("/channels/internet/search", response_model=SearchResponse)
async def search_internet(input: SearchCreate):
    hits = await web_search(input.query)
    return SearchResponse(query=input.query, engine=SEARCH_ENGINE, results=hits)
