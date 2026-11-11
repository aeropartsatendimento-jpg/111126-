"""Scheduling-decision criteria for the briefing cron webhook.

All tests in this module mutate the single shared /briefing/settings document, so
they are kept together in one module: pytest.ini pins "--dist loadscope", meaning
every test in this module runs on the same xdist worker and therefore serially
with respect to each other -- avoiding a cross-worker race on the shared settings
and shared daily markers that splitting this across files would otherwise cause.

Criteria covered:
  - auto=false prevents the automatic briefing from running (skipped outcome).
  - A future configured hour prevents early execution (skipped outcome), or is
    documented as not-applicable when the clock leaves no valid future hour.
  - The due automatic briefing is created at most once per day across two valid
    run_ids (idempotent dedup of the shared daily briefing + room message).
  - A failed/expired daily marker recovers without duplicating the briefing.

Settings are always restored to what was read at the start of each test.
"""

import os
import time
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pymongo
import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "qg_zero")
TZ = ZoneInfo("America/Sao_Paulo")


@pytest.fixture
def mongo():
    c = pymongo.MongoClient(MONGO_URL)
    try:
        yield c[DB_NAME]
    finally:
        c.close()


def _secret() -> str:
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    assert secret, "WEBHOOK_CRON_SECRET must be set in backend/.env for this test to be meaningful"
    return secret


def _poll_dispatch_outcome(mongo, run_id: str, timeout: float = 20.0) -> dict:
    deadline = time.time() + timeout
    doc = None
    while time.time() < deadline:
        doc = mongo.cron_runs.find_one({"_id": f"dispatch:{run_id}"})
        if doc and doc.get("status") in ("completed", "failed"):
            return doc
        time.sleep(0.5)
    return doc or {}


def _fire_webhook(client, run_id: str):
    return client.post(
        "/cron/briefing",
        json={"event": "schedule.triggered", "schedule_id": "morning-briefing", "run_id": run_id},
        headers={"Authorization": f"Bearer {_secret()}", "X-Webhook-Id": run_id},
    )


def _restore_settings(client, original: dict):
    restore = {
        "auto": original.get("auto", True),
        "hour": original.get("hour", 7),
        "city": original.get("city", "São Paulo"),
    }
    restored = client.patch("/briefing/settings", json=restore)
    assert restored.status_code == 200
    assert restored.json() == original


def test_auto_false_skips_automatic_briefing(client, mongo):
    original = client.get("/briefing/settings").json()
    run_id = f"tscheck-cronauto-{uuid.uuid4().hex[:12]}"
    try:
        patched = client.patch("/briefing/settings", json={"auto": False})
        assert patched.status_code == 200, patched.text
        assert patched.json()["auto"] is False

        resp = _fire_webhook(client, run_id)
        assert resp.status_code == 202, resp.text
        assert resp.json()["duplicate"] is False

        dispatch_doc = _poll_dispatch_outcome(mongo, run_id)
        assert dispatch_doc.get("status") == "completed", dispatch_doc
        assert dispatch_doc.get("outcome") == "skipped", dispatch_doc
    finally:
        mongo.cron_runs.delete_one({"_id": f"dispatch:{run_id}"})
        _restore_settings(client, original)


def test_future_hour_skips_early_run(client, mongo):
    current_hour = datetime.now(TZ).hour
    if current_hour >= 23:
        pytest.skip(
            "Not applicable: current America/Sao_Paulo hour is 23, leaving no valid "
            "future hour (max allowed is 23) to exercise this case."
        )

    future_hour = current_hour + 1
    original = client.get("/briefing/settings").json()
    run_id = f"tscheck-cronhour-{uuid.uuid4().hex[:12]}"
    try:
        patched = client.patch("/briefing/settings", json={"auto": True, "hour": future_hour})
        assert patched.status_code == 200, patched.text
        assert patched.json()["hour"] == future_hour

        resp = _fire_webhook(client, run_id)
        assert resp.status_code == 202, resp.text
        assert resp.json()["duplicate"] is False

        dispatch_doc = _poll_dispatch_outcome(mongo, run_id)
        assert dispatch_doc.get("status") == "completed", dispatch_doc
        assert dispatch_doc.get("outcome") == "skipped", dispatch_doc
    finally:
        mongo.cron_runs.delete_one({"_id": f"dispatch:{run_id}"})
        _restore_settings(client, original)


def test_due_briefing_created_at_most_once_per_day(client, mongo):
    original = client.get("/briefing/settings").json()
    today = datetime.now(TZ).strftime("%Y-%m-%d")
    auto_id = f"auto-briefing-{today}"
    room_id = f"room-{auto_id}"
    current_hour = datetime.now(TZ).hour
    run_ids = [f"tscheck-cronday-{uuid.uuid4().hex[:12]}" for _ in range(2)]
    try:
        patched = client.patch("/briefing/settings", json={"auto": True, "hour": current_hour})
        assert patched.status_code == 200, patched.text

        for run_id in run_ids:
            resp = _fire_webhook(client, run_id)
            assert resp.status_code == 202, resp.text
            assert resp.json()["duplicate"] is False
            dispatch_doc = _poll_dispatch_outcome(mongo, run_id)
            assert dispatch_doc.get("status") == "completed", dispatch_doc
            assert dispatch_doc.get("outcome") in ("created", "skipped"), dispatch_doc

        assert mongo.briefings.count_documents({"id": auto_id, "day": today}) == 1
        assert mongo.room_messages.count_documents({"id": room_id}) == 1
    finally:
        for run_id in run_ids:
            mongo.cron_runs.delete_one({"_id": f"dispatch:{run_id}"})
        _restore_settings(client, original)


def test_failed_marker_recovers_without_duplicating(client, mongo):
    today = datetime.now(TZ).strftime("%Y-%m-%d")
    auto_id = f"auto-briefing-{today}"
    room_id = f"room-{auto_id}"
    marker_id = f"briefing-day:{today}"
    current_hour = datetime.now(TZ).hour

    marker_before = mongo.cron_runs.find_one({"_id": marker_id})
    if marker_before is None:
        pytest.skip(
            "Not applicable: no daily marker exists yet for today (automatic briefing "
            "never ran today), so there is nothing to simulate a failure recovery from."
        )
    briefing_before = mongo.briefings.find_one({"id": auto_id})
    briefing_before_count = mongo.briefings.count_documents({"id": auto_id})
    room_before_count = mongo.room_messages.count_documents({"id": room_id})

    original = client.get("/briefing/settings").json()
    run_id = f"tscheck-cronfail-{uuid.uuid4().hex[:12]}"
    try:
        mongo.cron_runs.update_one({"_id": marker_id}, {"$set": {"status": "failed"}})

        patched = client.patch("/briefing/settings", json={"auto": True, "hour": current_hour})
        assert patched.status_code == 200, patched.text

        resp = _fire_webhook(client, run_id)
        assert resp.status_code == 202, resp.text
        dispatch_doc = _poll_dispatch_outcome(mongo, run_id)
        assert dispatch_doc.get("status") == "completed", dispatch_doc

        marker_after = mongo.cron_runs.find_one({"_id": marker_id})
        assert marker_after.get("status") == "completed", marker_after
        assert mongo.briefings.count_documents({"id": auto_id}) == max(briefing_before_count, 1)
        assert mongo.room_messages.count_documents({"id": room_id}) == max(room_before_count, 1)
        if briefing_before:
            after_doc = mongo.briefings.find_one({"id": auto_id})
            assert after_doc["content"] == briefing_before["content"]
            assert after_doc["created_at"] == briefing_before["created_at"]
    finally:
        mongo.cron_runs.delete_one({"_id": f"dispatch:{run_id}"})
        mongo.cron_runs.update_one(
            {"_id": marker_id},
            {"$set": {"status": marker_before["status"], "lease_until": marker_before["lease_until"]}},
        )
        _restore_settings(client, original)
