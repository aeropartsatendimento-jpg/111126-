"""Criterion: a mission can be submitted from the Cockpit and gets processed."""

import time


def test_mission_create_and_tasks_appear(client):
    resp = client.post("/missions", json={"text": "tscheck-mission: organizar estoque critico da loja"})
    assert resp.status_code == 200, resp.text
    mission = resp.json()
    assert mission["status"] in ("planning", "delegating", "completed", "failed")
    mission_id = mission["id"]

    # background run_mission creates room message(s) + tasks; poll briefly
    tasks = []
    for _ in range(20):
        tasks = client.get("/tasks", params={"mission_id": mission_id}).json()
        if tasks:
            break
        time.sleep(1)
    assert tasks, f"expected tasks to be created for mission {mission_id}"
    for t in tasks:
        assert t["status"] in ("queued", "working", "review", "verified", "rejected", "failed", "done")

    room = client.get("/room/messages").json()
    assert any(m.get("mission_id") == mission_id for m in room), "expected a room message referencing the mission"


def test_mission_create_rejects_short_text(client):
    resp = client.post("/missions", json={"text": "a"})
    assert resp.status_code == 422
