"""Criterion: a valid briefing cron delivery gets a fast ack and duplicates are idempotent.

POST /api/cron/briefing with a valid schedule.triggered envelope for schedule_id
"morning-briefing" returns 202 accepted=true; replaying the same X-Webhook-Id (or the
same run_id) returns duplicate=true and does not schedule a second dispatch.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
import uuid

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


def _secret() -> str:
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    assert secret, "WEBHOOK_CRON_SECRET must be set in backend/.env for this test to be meaningful"
    return secret


def test_valid_delivery_accepted_and_duplicate_is_idempotent(client, mongo):
    run_id = f"tscheck-cronwh-{uuid.uuid4().hex[:12]}"
    headers = {"Authorization": f"Bearer {_secret()}", "X-Webhook-Id": run_id}
    body = {"event": "schedule.triggered", "schedule_id": "morning-briefing", "run_id": run_id}

    try:
        first = client.post("/cron/briefing", json=body, headers=headers)
        assert first.status_code == 202, first.text
        payload = first.json()
        assert payload["accepted"] is True
        assert payload["duplicate"] is False
        assert payload["run_id"] == run_id

        dispatch_doc = mongo.cron_runs.find_one({"_id": f"dispatch:{run_id}"})
        assert dispatch_doc is not None
        assert dispatch_doc["schedule_id"] == "morning-briefing"

        # Replay the exact same webhook id -> must be treated as a duplicate, not a new dispatch.
        second = client.post("/cron/briefing", json=body, headers=headers)
        assert second.status_code == 202, second.text
        second_payload = second.json()
        assert second_payload["duplicate"] is True
        assert second_payload["run_id"] == run_id

        # Still exactly one dispatch row for this run id.
        assert mongo.cron_runs.count_documents({"_id": f"dispatch:{run_id}"}) == 1
    finally:
        mongo.cron_runs.delete_one({"_id": f"dispatch:{run_id}"})


def test_duplicate_via_run_id_without_header_is_also_idempotent(client, mongo):
    run_id = f"tscheck-cronwh-{uuid.uuid4().hex[:12]}"
    headers = {"Authorization": f"Bearer {_secret()}"}
    body = {"event": "schedule.triggered", "schedule_id": "morning-briefing", "run_id": run_id}

    try:
        first = client.post("/cron/briefing", json=body, headers=headers)
        assert first.status_code == 202, first.text
        assert first.json()["duplicate"] is False

        second = client.post("/cron/briefing", json=body, headers=headers)
        assert second.status_code == 202, second.text
        assert second.json()["duplicate"] is True

        assert mongo.cron_runs.count_documents({"_id": f"dispatch:{run_id}"}) == 1
    finally:
        mongo.cron_runs.delete_one({"_id": f"dispatch:{run_id}"})
