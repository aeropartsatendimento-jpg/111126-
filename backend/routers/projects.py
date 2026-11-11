"""Projects (resume card + continue) and saved accounts."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.orchestrator import resume_text, start_mission
from models.models import (
    Account, AccountCreate, AccountUpdate, Mission, Project, ProjectCreate, ProjectUpdate, aware,
)

router = APIRouter()

PROJECT_STATUSES = {"active", "paused", "done"}
ACCOUNT_STATUSES = {"available", "busy", "offline", "unverified"}


def to_project(doc: dict) -> Project:
    out = {**doc, "created_at": aware(doc["created_at"]), "updated_at": aware(doc["updated_at"])}
    if doc.get("last_verified_at"):
        out["last_verified_at"] = aware(doc["last_verified_at"])
    return Project(**out)


@router.get("/projects", response_model=list[Project])
async def list_projects():
    docs = await db.projects.find().sort("updated_at", -1).to_list(100)
    return [to_project(d) for d in docs]


@router.post("/projects", response_model=Project)
async def create_project(input: ProjectCreate):
    project = Project(name=input.name, objective=input.objective)
    await db.projects.insert_one(project.model_dump())
    return project


@router.get("/projects/{pid}", response_model=Project)
async def get_project(pid: str):
    doc = await db.projects.find_one({"id": pid})
    if not doc:
        raise HTTPException(status_code=404, detail="project not found")
    return to_project(doc)


@router.patch("/projects/{pid}", response_model=Project)
async def update_project(pid: str, input: ProjectUpdate):
    doc = await db.projects.find_one({"id": pid})
    if not doc:
        raise HTTPException(status_code=404, detail="project not found")
    update = {k: v for k, v in input.model_dump().items() if v is not None}
    if "status" in update and update["status"] not in PROJECT_STATUSES:
        raise HTTPException(status_code=422, detail="status must be active|paused|done")
    update["updated_at"] = datetime.now(timezone.utc)
    await db.projects.update_one({"id": pid}, {"$set": update})
    return to_project({**doc, **update})


@router.post("/projects/{pid}/resume", response_model=Mission)
async def resume_project(pid: str):
    doc = await db.projects.find_one({"id": pid})
    if not doc:
        raise HTTPException(status_code=404, detail="project not found")
    return Mission(**await start_mission(resume_text(doc), pid))


@router.get("/accounts", response_model=list[Account])
async def list_accounts():
    docs = await db.accounts.find().sort("created_at", 1).to_list(100)
    return [Account(**{**d, "created_at": aware(d["created_at"])}) for d in docs]


@router.post("/accounts", response_model=Account)
async def create_account(input: AccountCreate):
    account = Account(**input.model_dump())
    await db.accounts.insert_one(account.model_dump())
    return account


@router.patch("/accounts/{aid}", response_model=Account)
async def update_account(aid: str, input: AccountUpdate):
    doc = await db.accounts.find_one({"id": aid})
    if not doc:
        raise HTTPException(status_code=404, detail="account not found")
    update = {k: v for k, v in input.model_dump().items() if v is not None}
    if "status" in update and update["status"] not in ACCOUNT_STATUSES:
        raise HTTPException(status_code=422, detail="invalid account status")
    await db.accounts.update_one({"id": aid}, {"$set": update})
    merged = {**doc, **update}
    return Account(**{**merged, "created_at": aware(merged["created_at"])})


@router.delete("/accounts/{aid}", status_code=204)
async def delete_account(aid: str):
    res = await db.accounts.delete_one({"id": aid})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="account not found")
