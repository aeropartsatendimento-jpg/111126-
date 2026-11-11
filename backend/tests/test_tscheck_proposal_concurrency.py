"""Criterion: two concurrent executions of the same proposal create a single mission.

There is no public endpoint to create a zero_message with intent=propondo, so this test
inserts (and cleans up) a synthetic fixture directly into the zero_messages collection,
per the briefing's seed_facts."""

import concurrent.futures
import os
import time
import uuid

import httpx
import pymongo
import pytest

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001")
API_URL = f"{BACKEND_URL}/api"


def _mongo_db():
    from pathlib import Path
    env_path = Path(__file__).parent.parent / ".env"
    db_name = os.environ.get("DB_NAME", "test_database")
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("DB_NAME="):
                db_name = line.split("=", 1)[1].strip()
            if line.startswith("MONGO_URL="):
                mongo_url = line.split("=", 1)[1].strip()
    mclient = pymongo.MongoClient(mongo_url)
    return mclient[db_name]


@pytest.fixture
def synthetic_proposal():
    mdb = _mongo_db()
    mid = f"tscheck-proposal-{uuid.uuid4().hex[:10]}"
    doc = {
        "id": mid,
        "role": "zero",
        "content": "Proposta sintetica de teste",
        "intent": "propondo",
        "proposal": "tscheck-proposal-race: organizar inventario da loja",
        "project_id": None,
        "mission_id": None,
        "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    }
    mdb.zero_messages.insert_one(doc)
    yield mid
    mdb.zero_messages.delete_one({"id": mid})
    msg = mdb.zero_messages.find_one({"id": mid})
    mission_id = msg.get("mission_id") if msg else None
    if mission_id:
        mdb.missions.delete_one({"id": mission_id})
        mdb.tasks.delete_many({"mission_id": mission_id})
        mdb.room_messages.delete_many({"mission_id": mission_id})


def test_concurrent_execute_proposal_creates_single_mission(client, synthetic_proposal):
    mid = synthetic_proposal

    def fire():
        with httpx.Client(base_url=API_URL, timeout=30.0) as c:
            return c.post(f"/zero/messages/{mid}/execute")

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        f1 = pool.submit(fire)
        f2 = pool.submit(fire)
        r1, r2 = f1.result(), f2.result()

    statuses = sorted([r1.status_code, r2.status_code])
    assert statuses == [200, 409], f"expected one 200 and one 409, got {statuses} ({r1.text} | {r2.text})"

    winner = r1 if r1.status_code == 200 else r2
    reserved_mission_id = winner.json()["mission_id"]
    assert reserved_mission_id

    mdb = _mongo_db()
    missions = list(mdb.missions.find({"id": reserved_mission_id}))
    assert len(missions) == 1, f"expected exactly one mission with reserved id, found {len(missions)}"

    # allow the background mission runner a moment to persist the first task, then verify
    # the proposal doc itself only ever references this single mission_id.
    time.sleep(1)
    msg = mdb.zero_messages.find_one({"id": mid})
    assert msg["mission_id"] == reserved_mission_id
