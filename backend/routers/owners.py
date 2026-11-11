"""Owner gate: only signed-in people whose VERIFIED email is on the owners
allowlist (Mongo `owners`, editable in-app) may use the HQ. The email list
of each Clerk user is looked up once and cached in `users`."""

import os
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

from clerk_auth import require_user
from lib.db import db
from models.models import MeOut, OwnerIn, OwnerOut

router = APIRouter()

SEED_OWNER = "aeropartzz@gmail.com"


def _verified_emails(user_id: str) -> list[str]:
    r = requests.get(
        f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
        headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app"},
    )
    r.raise_for_status()
    return [
        e["email_address"].lower()
        for e in r.json().get("email_addresses", [])
        if (e.get("verification") or {}).get("status") == "verified"
    ]


async def _member(user: dict) -> dict:
    uid = user["user_id"]
    doc = await db.users.find_one({"user_id": uid})
    if not doc or not doc.get("emails"):
        emails = await run_in_threadpool(_verified_emails, uid)
        await db.users.update_one({"user_id": uid}, {"$set": {"emails": emails, "updated_at": datetime.now(timezone.utc)}}, upsert=True)
        doc = {"user_id": uid, "emails": emails}
    return doc


async def _is_owner(emails: list[str]) -> bool:
    if await db.owners.count_documents({}) == 0:
        await db.owners.update_one({"email": SEED_OWNER}, {"$setOnInsert": {"email": SEED_OWNER}}, upsert=True)
    return await db.owners.find_one({"email": {"$in": emails}}) is not None


async def require_owner(user: dict = Depends(require_user)) -> dict:
    member = await _member(user)
    if not await _is_owner(member["emails"]):
        raise HTTPException(status_code=403, detail="Acesso restrito ao Chefe")
    return member


@router.get("/me", response_model=MeOut)
async def me(user: dict = Depends(require_user)):
    member = await _member(user)
    return MeOut(user_id=member["user_id"], emails=member["emails"], is_owner=await _is_owner(member["emails"]))


@router.get("/owners", response_model=list[OwnerOut])
async def list_owners(_: dict = Depends(require_owner)):
    return [OwnerOut(email=d["email"]) for d in await db.owners.find().sort("email", 1).to_list(50)]


@router.post("/owners", response_model=OwnerOut)
async def add_owner(input: OwnerIn, _: dict = Depends(require_owner)):
    email = input.email.strip().lower()
    await db.owners.update_one({"email": email}, {"$setOnInsert": {"email": email}}, upsert=True)
    return OwnerOut(email=email)


@router.delete("/owners/{email}", status_code=204)
async def remove_owner(email: str, member: dict = Depends(require_owner)):
    email = email.strip().lower()
    if await db.owners.count_documents({}) <= 1:
        raise HTTPException(status_code=409, detail="Mantenha ao menos um e-mail de Chefe")
    remaining = await db.owners.find({"email": {"$ne": email}}).to_list(50)
    if not {d["email"] for d in remaining} & set(member["emails"]):
        raise HTTPException(status_code=409, detail="Você perderia seu próprio acesso")
    res = await db.owners.delete_one({"email": email})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="e-mail não encontrado")
