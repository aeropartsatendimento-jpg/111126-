"""Criteria: concurrent reviews of the same task resolve to a single decision, with
idempotent side effects (one memory, one room message with the deterministic id)."""

import concurrent.futures
import time

import httpx
import pymongo
import pytest
import os

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001")
API_URL = f"{BACKEND_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


def _mongo_db():
    # Read the same DB_NAME the backend uses, from backend/.env if env vars aren't set.
    from pathlib import Path
    env_path = Path(__file__).parent.parent / ".env"
    db_name = DB_NAME
    mongo_url = MONGO_URL
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("DB_NAME="):
                db_name = line.split("=", 1)[1].strip()
            if line.startswith("MONGO_URL="):
                mongo_url = line.split("=", 1)[1].strip()
    mclient = pymongo.MongoClient(mongo_url)
    return mclient[db_name]


def _wait_for_review_task(client, mission_id, timeout=40):
    deadline = time.time() + timeout
    review_task = None
    while time.time() < deadline:
        tasks = client.get("/tasks", params={"mission_id": mission_id}).json()
        review_task = next((t for t in tasks if t["status"] == "review"), None)
        if review_task:
            return review_task
        if tasks and all(t["status"] in ("verified", "rejected", "failed") for t in tasks):
            return None
        time.sleep(1)
    return None


def test_concurrent_reviews_single_decision_and_idempotent_effects(client):
    resp = client.post("/missions", json={"text": "tscheck-review-race: preparar nota fiscal da loja"})
    assert resp.status_code == 200, resp.text
    mission_id = resp.json()["id"]

    task = _wait_for_review_task(client, mission_id)
    if not task:
        pytest.skip("no task reached review status within timeout")

    tid = task["id"]

    def fire(approve: bool):
        with httpx.Client(base_url=API_URL, timeout=30.0) as c:
            return c.patch(f"/tasks/{tid}/review", json={"approve": approve, "note": "tscheck-race"})

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        f1 = pool.submit(fire, True)
        f2 = pool.submit(fire, False)
        r1, r2 = f1.result(), f2.result()

    statuses = sorted([r1.status_code, r2.status_code])
    assert statuses == [200, 409], f"expected one 200 and one 409, got {statuses} ({r1.text} | {r2.text})"

    final = client.get(f"/tasks", params={"mission_id": mission_id}).json()
    final_task = next(t for t in final if t["id"] == tid)
    assert final_task["status"] in ("verified", "rejected")

    # review_effects isn't exposed via the API response model; check the raw doc so we
    # can wait for the loser's fire-and-forget effects completion (if any) to settle.
    mdb = _mongo_db()
    deadline = time.time() + 10
    raw = mdb.tasks.find_one({"id": tid})
    while time.time() < deadline and raw.get("review_effects") != "completed":
        time.sleep(0.5)
        raw = mdb.tasks.find_one({"id": tid})
    assert raw.get("review_effects") == "completed"

    memories = list(mdb.memories.find({"id": f"task-review-{tid}"}))
    messages = list(mdb.room_messages.find({"id": f"task-review-{tid}"}))
    # idempotent effects: at most one of each, regardless of which request "won"
    assert len(memories) <= 1, f"expected at most 1 memory, found {len(memories)}"
    assert len(messages) == 1, f"expected exactly 1 room message with deterministic id, found {len(messages)}"
