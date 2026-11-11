"""Idempotent morning-briefing decision logic invoked by the managed cron."""

import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from lib.db import db
from lib.orchestrator import run_briefing

logger = logging.getLogger(__name__)

TZ = ZoneInfo("America/Sao_Paulo")

DEFAULT_SETTINGS = {"auto": True, "hour": 7, "city": "São Paulo"}


async def briefing_settings() -> dict:
    doc = await db.settings.find_one({"key": "briefing"}) or {}
    return {**DEFAULT_SETTINGS, **{k: doc[k] for k in DEFAULT_SETTINGS if k in doc}}


async def maybe_run_briefing(force: bool = False) -> dict | None:
    settings = await briefing_settings()
    now = datetime.now(TZ)
    today = now.strftime("%Y-%m-%d")

    if not force:
        if not settings.get("auto", True):
            return None
        if now.hour < int(settings.get("hour", 7)):
            return None
        existing = await db.briefings.find_one({"day": today})
        auto_id = f"auto-briefing-{today}"
        if existing and existing.get("id") != auto_id:
            return None

        now_utc = datetime.now(timezone.utc)
        lease_until = now_utc + timedelta(minutes=20)
        marker_id = f"briefing-day:{today}"
        marker = {
            "_id": marker_id,
            "id": marker_id,
            "kind": "daily-briefing",
            "day": today,
            "status": "working",
            "lease_until": lease_until,
            "created_at": now_utc,
            "updated_at": now_utc,
        }
        try:
            await db.cron_runs.insert_one(marker)
        except DuplicateKeyError:
            claimed = await db.cron_runs.find_one_and_update(
                {
                    "_id": marker_id,
                    "$or": [
                        {"status": "failed"},
                        {"status": "working", "lease_until": {"$lte": now_utc}},
                    ],
                },
                {
                    "$set": {
                        "status": "working",
                        "lease_until": lease_until,
                        "updated_at": now_utc,
                    }
                },
                return_document=ReturnDocument.AFTER,
            )
            if not claimed:
                return None

    logger.info("running morning briefing (force=%s, day=%s)", force, today)
    try:
        result = await run_briefing(
            settings,
            day=today,
            idempotency_key=None if force else f"auto-briefing-{today}",
        )
    except Exception:
        if not force:
            await db.cron_runs.update_one(
                {"_id": f"briefing-day:{today}"},
                {"$set": {"status": "failed", "updated_at": datetime.now(timezone.utc)}},
            )
        raise

    if not force:
        await db.cron_runs.update_one(
            {"_id": f"briefing-day:{today}"},
            {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc)}},
        )
    return result
