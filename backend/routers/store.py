"""AeroPartz panel — editable stock, orders and coupons (Luna watches these)."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.models import StoreItem, StoreItemCreate, StoreItemUpdate, aware

router = APIRouter()

STATUSES = {"stock": {"critical", "ok"}, "order": {"open", "done"}, "coupon": {"active", "expired"}}


def to_item(doc: dict) -> StoreItem:
    return StoreItem(**{**doc, "updated_at": aware(doc["updated_at"])})


@router.get("/store/items", response_model=list[StoreItem])
async def list_items():
    docs = await db.store_items.find().sort("updated_at", -1).to_list(300)
    return [to_item(d) for d in docs]


@router.post("/store/items", response_model=StoreItem)
async def create_item(input: StoreItemCreate):
    if input.kind not in STATUSES or input.status not in STATUSES[input.kind]:
        raise HTTPException(status_code=422, detail="invalid kind/status")
    item = StoreItem(**input.model_dump())
    await db.store_items.insert_one(item.model_dump())
    return item


@router.patch("/store/items/{iid}", response_model=StoreItem)
async def update_item(iid: str, input: StoreItemUpdate):
    doc = await db.store_items.find_one({"id": iid})
    if not doc:
        raise HTTPException(status_code=404, detail="item not found")
    update = {k: v for k, v in input.model_dump().items() if v is not None}
    if "status" in update and update["status"] not in STATUSES[doc["kind"]]:
        raise HTTPException(status_code=422, detail="invalid status for this kind")
    update["updated_at"] = datetime.now(timezone.utc)
    await db.store_items.update_one({"id": iid}, {"$set": update})
    return to_item({**doc, **update})


@router.delete("/store/items/{iid}", status_code=204)
async def delete_item(iid: str):
    res = await db.store_items.delete_one({"id": iid})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="item not found")
