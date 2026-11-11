"""Morning-briefing scheduler.

A background loop ticks every 30 minutes; once per day, after the configured
hour (America/Sao_Paulo), it runs the briefing if it hasn't run today yet.
"""

import asyncio
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from lib.db import db
from lib.orchestrator import run_briefing

logger = logging.getLogger(__name__)

CHECK_INTERVAL_S = 1800
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
        last = await db.briefings.find_one(sort=[("created_at", -1)])
        if last and last.get("day") == today:
            return None

    logger.info("running morning briefing (force=%s, day=%s)", force, today)
    return await run_briefing(settings, day=today)


async def briefing_loop() -> None:
    while True:
        try:
            await maybe_run_briefing()
        except Exception:
            logger.exception("briefing tick failed")
        await asyncio.sleep(CHECK_INTERVAL_S)
