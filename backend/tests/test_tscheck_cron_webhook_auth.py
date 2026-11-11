"""Criterion: the briefing cron webhook requires auth and validates its envelope.

Missing/incorrect token -> 401, no dispatch record created.
Invalid JSON / unexpected schedule_id -> 400.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

import pymongo
import pytest

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "qg_zero")


@pytest.fixture
def mongo():
    c = pymongo.MongoClient(MONGO_URL)
    try:
        yield c[DB_NAME]
    finally:
        c.close()


def test_missing_auth_returns_401_and_no_dispatch(client, mongo):
    webhook_id = "tscheck-cronauth-noauth-001"
    resp = client.post(
        "/cron/briefing",
        json={"event": "schedule.triggered", "schedule_id": "morning-briefing", "run_id": webhook_id},
        headers={"X-Webhook-Id": webhook_id},
    )
    assert resp.status_code == 401, resp.text
    assert mongo.cron_runs.find_one({"_id": f"dispatch:{webhook_id}"}) is None


def test_wrong_token_returns_401_and_no_dispatch(client, mongo):
    webhook_id = "tscheck-cronauth-wrongtoken-002"
    resp = client.post(
        "/cron/briefing",
        json={"event": "schedule.triggered", "schedule_id": "morning-briefing", "run_id": webhook_id},
        headers={"Authorization": "Bearer not-the-real-secret", "X-Webhook-Id": webhook_id},
    )
    assert resp.status_code == 401, resp.text
    assert mongo.cron_runs.find_one({"_id": f"dispatch:{webhook_id}"}) is None


def test_invalid_json_body_returns_400(client):
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    assert secret, "WEBHOOK_CRON_SECRET must be set in backend/.env for this test to be meaningful"
    resp = client.post(
        "/cron/briefing",
        content=b"not-json",
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
    )
    assert resp.status_code == 400, resp.text


def test_unexpected_schedule_id_returns_400(client, mongo):
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    assert secret, "WEBHOOK_CRON_SECRET must be set in backend/.env for this test to be meaningful"
    webhook_id = "tscheck-cronauth-badschedule-003"
    resp = client.post(
        "/cron/briefing",
        json={"event": "schedule.triggered", "schedule_id": "not-morning-briefing", "run_id": webhook_id},
        headers={"Authorization": f"Bearer {secret}", "X-Webhook-Id": webhook_id},
    )
    assert resp.status_code == 400, resp.text
    assert mongo.cron_runs.find_one({"_id": f"dispatch:{webhook_id}"}) is None
