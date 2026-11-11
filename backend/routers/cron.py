"""Authenticated webhook entrypoints for platform-managed schedules."""

import hmac
import os
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request, status
from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError

from lib.db import db
from lib.scheduler import maybe_run_briefing
from models.models import CronWebhookAck, CronWebhookEnvelope

router = APIRouter()


async def _process_briefing_dispatch(dispatch_id: str) -> None:
    try:
        result = await maybe_run_briefing()
        await db.cron_runs.update_one(
            {"_id": f"dispatch:{dispatch_id}"},
            {
                "$set": {
                    "status": "completed",
                    "outcome": "created" if result else "skipped",
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
    except Exception as exc:
        await db.cron_runs.update_one(
            {"_id": f"dispatch:{dispatch_id}"},
            {
                "$set": {
                    "status": "failed",
                    "error": type(exc).__name__,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )


@router.post(
    "/cron/briefing",
    response_model=CronWebhookAck,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_briefing_cron(
    request: Request,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None),
    x_webhook_id: str | None = Header(default=None),
) -> CronWebhookAck:
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    supplied = authorization.removeprefix("Bearer ") if authorization and authorization.startswith("Bearer ") else ""
    if not secret:
        raise HTTPException(status_code=503, detail="cron webhook is not configured")
    if not supplied or not hmac.compare_digest(supplied, secret):
        raise HTTPException(status_code=401, detail="unauthorized")

    try:
        envelope = CronWebhookEnvelope.model_validate(await request.json())
    except (ValidationError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="invalid cron webhook body") from None

    if envelope.schedule_id != "morning-briefing":
        raise HTTPException(status_code=400, detail="unexpected schedule_id")

    dispatch_id = (x_webhook_id or envelope.run_id or "").strip()
    if not dispatch_id or len(dispatch_id) > 200:
        raise HTTPException(status_code=400, detail="missing or invalid run id")

    now = datetime.now(timezone.utc)
    doc = {
        "_id": f"dispatch:{dispatch_id}",
        "id": f"dispatch:{dispatch_id}",
        "kind": "briefing-dispatch",
        "status": "queued",
        "schedule_id": envelope.schedule_id,
        "dispatch_id": dispatch_id,
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.cron_runs.insert_one(doc)
    except DuplicateKeyError:
        return CronWebhookAck(duplicate=True, run_id=dispatch_id)

    background_tasks.add_task(_process_briefing_dispatch, dispatch_id)
    return CronWebhookAck(run_id=dispatch_id)