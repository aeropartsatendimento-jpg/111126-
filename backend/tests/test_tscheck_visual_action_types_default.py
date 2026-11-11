"""Criterion: omitting action_types keeps backward compatibility.

POST without action_types must default to the six actions, and legacy
missions stored in MongoDB without an "actions" field must still serialize
with an empty actions list instead of erroring.
"""

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pymongo

ALL_TYPES = ["open", "read", "click", "write", "copy", "paste"]


def _mongo_db():
    db_name = os.environ.get("DB_NAME", "test_database")
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("DB_NAME="):
                db_name = line.split("=", 1)[1].strip()
            if line.startswith("MONGO_URL="):
                mongo_url = line.split("=", 1)[1].strip()
    return pymongo.MongoClient(mongo_url)[db_name]


def test_omitting_action_types_defaults_to_six(client):
    resp = client.post(
        "/visual/missions",
        json={
            "url": "https://example.com/tscheck-default-plan",
            "objective": "tscheck-visual: sem action_types explicito",
        },
    )
    assert resp.status_code == 200, resp.text
    mission = resp.json()
    assert [a["type"] for a in mission["actions"]] == ALL_TYPES


def test_legacy_mission_without_actions_field_serializes_empty_list(client):
    mdb = _mongo_db()
    mission_id = f"tscheck-legacy-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    legacy_doc = {
        "id": mission_id,
        "url": "https://example.com/tscheck-legacy",
        "objective": "tscheck-visual: missao antiga sem campo actions",
        "status": "completed",
        "mode": "simulated",
        "steps": [],
        # deliberately no "actions" key, mimicking pre-migration documents
        "result": "[MODO SIMULADO] missao antiga",
        "created_at": now,
        "updated_at": now,
    }
    mdb.visual_missions.insert_one(legacy_doc)
    try:
        resp = client.get(f"/visual/missions/{mission_id}")
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["actions"] == []
    finally:
        mdb.visual_missions.delete_one({"id": mission_id})
