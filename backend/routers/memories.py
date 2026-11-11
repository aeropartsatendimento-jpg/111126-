"""Memory with origin — decisions, verified facts, proposals and stale info,
each with date and source. A new decision supersedes an old one without
deleting it (history is kept)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.models import Memory, MemoryCreate, aware

router = APIRouter()

KINDS = {"decisao_chefe", "fato_verificado", "proposta", "antiga"}


def to_mem(d: dict) -> Memory:
    return Memory(**{**d, "created_at": aware(d["created_at"])})


@router.get("/memories", response_model=list[Memory])
async def list_memories(project_id: Optional[str] = None, include_superseded: bool = True):
    q: dict = {}
    if project_id:
        q["project_id"] = project_id
    if not include_superseded:
        q["superseded_by"] = None
    return [to_mem(d) for d in await db.memories.find(q).sort("created_at", -1).to_list(300)]


@router.post("/memories", response_model=Memory)
async def create_memory(input: MemoryCreate):
    if input.kind not in KINDS:
        raise HTTPException(status_code=422, detail="kind inválido")
    mem = Memory(**input.model_dump(exclude={"replaces"}), source=input.source or "Chefe (painel)")
    if input.replaces:
        old = await db.memories.find_one({"id": input.replaces})
        if not old:
            raise HTTPException(status_code=404, detail="memória a substituir não encontrada")
        mem.replaces = old["id"]
        await db.memories.update_one({"id": old["id"]}, {"$set": {"superseded_by": mem.id, "superseded_at": datetime.now(timezone.utc)}})
    await db.memories.insert_one(mem.model_dump())
    return mem
