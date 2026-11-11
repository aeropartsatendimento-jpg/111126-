"""Criterion: the six Zero actions are persisted and completed.

A visual mission created with all six action_types must persist type, label,
target, status and output for each action, and end with all six marked
completed, in the chosen order.
"""

import time

ALL_TYPES = ["open", "read", "click", "write", "copy", "paste"]


def test_full_action_plan_persists_and_completes(client):
    payload = {
        "url": "https://example.com/tscheck-full-plan",
        "objective": "tscheck-visual: executar as seis acoes simuladas na ordem escolhida",
        "action_types": ALL_TYPES,
    }
    resp = client.post("/visual/missions", json=payload)
    assert resp.status_code == 200, resp.text
    mission = resp.json()
    mission_id = mission["id"]

    assert [a["type"] for a in mission["actions"]] == ALL_TYPES
    for action in mission["actions"]:
        assert action["status"] == "pending"
        assert action["label"]
        assert action["target"]

    final = mission
    for _ in range(20):
        final = client.get(f"/visual/missions/{mission_id}").json()
        if final["status"] in ("completed", "failed"):
            break
        time.sleep(1)

    assert final["status"] == "completed", final
    actions = final["actions"]
    assert len(actions) == 6
    assert [a["type"] for a in actions] == ALL_TYPES
    for action in actions:
        assert action["status"] == "completed", action
        assert action["label"]
        assert action["target"]
        assert action["output"], action
