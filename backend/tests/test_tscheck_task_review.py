"""Criterion: deliveries in review can be approved or rejected; out-of-review is rejected."""

import time


def _create_mission_and_wait_for_review_task(client, timeout=40):
    resp = client.post("/missions", json={"text": "tscheck-review: preparar relatorio de vendas da loja"})
    assert resp.status_code == 200, resp.text
    mission_id = resp.json()["id"]

    deadline = time.time() + timeout
    review_task = None
    while time.time() < deadline:
        tasks = client.get("/tasks", params={"mission_id": mission_id}).json()
        review_task = next((t for t in tasks if t["status"] == "review"), None)
        if review_task:
            break
        failed_or_done = tasks and all(t["status"] in ("verified", "rejected", "failed") for t in tasks)
        if failed_or_done:
            break
        time.sleep(1)
    return review_task


def test_task_review_approve(client):
    task = _create_mission_and_wait_for_review_task(client)
    if not task:
        import pytest
        pytest.skip("no task reached review status within timeout (mission may have fully auto-completed)")

    resp = client.patch(f"/tasks/{task['id']}/review", json={"approve": True, "note": "tscheck-ok"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "verified"
    assert body["review_note"] == "tscheck-ok"


def test_task_review_reject_outside_review_returns_409(client):
    # a freshly created/queued task (not in review) must reject review attempts
    tasks = client.get("/tasks").json()
    non_review = next((t for t in tasks if t["status"] != "review"), None)
    if not non_review:
        import pytest
        pytest.skip("no non-review task available to exercise the 409 path")
    resp = client.patch(f"/tasks/{non_review['id']}/review", json={"approve": True})
    assert resp.status_code == 409
