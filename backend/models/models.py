"""Pydantic v2 models for the QG do Zero squad — one source of truth.

Every model here has a hand-written TS mirror in frontend/src/lib/types.ts;
keep the two in sync in the same edit (nothing infers across the boundary).
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


def new_id() -> str:
    return str(uuid.uuid4())


def aware(dt: datetime) -> datetime:
    """Motor hands naive datetimes back from BSON (stored UTC) — normalise on read."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class Agent(BaseModel):
    id: str = Field(default_factory=new_id)
    key: str  # zero | pro | jarvis | aluna | plus
    name: str
    role_pt: str
    role_en: str
    description_pt: str
    description_en: str
    provider: str  # openai | gemini
    model: str
    brain: str = ""  # borrowed upstream brain (Router Eight, Codex Pro, ChatGPT Plus...)
    status: str = "idle"  # idle | working (computed on read)
    open_tasks: int = 0  # computed on read
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Mission(BaseModel):
    id: str = Field(default_factory=new_id)
    text: str
    status: str  # planning | delegating | completed | failed
    plan_intro: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MissionCreate(BaseModel):
    text: str = Field(min_length=3, max_length=2000)


class Task(BaseModel):
    id: str = Field(default_factory=new_id)
    mission_id: str
    mission_text: str = ""
    agent_key: str
    title: str
    detail: str = ""
    status: str  # queued | working | done | failed
    result: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RoomMessage(BaseModel):
    id: str = Field(default_factory=new_id)
    sender_key: str  # user | zero | pro | jarvis | aluna | plus | system
    kind: str  # chat | delegation | system | summary
    content: str
    mission_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RoomMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class DirectMessage(BaseModel):
    id: str = Field(default_factory=new_id)
    role: str  # user | zero
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ZeroChatCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class Channel(BaseModel):
    id: str = Field(default_factory=new_id)
    key: str  # whatsapp | facebook | internet
    name: str
    description_pt: str
    description_en: str
    status: str = "disconnected"  # connected | disconnected
    config: dict[str, str] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChannelUpdate(BaseModel):
    status: Optional[str] = None
    config: Optional[dict[str, str]] = None


class SearchCreate(BaseModel):
    query: str = Field(min_length=1, max_length=300)


class SearchHit(BaseModel):
    title: str
    url: str
    snippet: str = ""


class SearchResponse(BaseModel):
    query: str
    engine: str
    results: list[SearchHit] = Field(default_factory=list)


class SystemInfo(BaseModel):
    app: str
    llm_configured: bool
    brain: str  # cloud | simulated
