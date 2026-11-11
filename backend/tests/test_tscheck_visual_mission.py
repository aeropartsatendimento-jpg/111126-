"""Criterion: a valid visual mission runs through four steps, stays simulated,
persists for GET by id, and contracts reject bad input (422 invalid url, 404 missing id)."""

import time


def test_visual_mission_runs_four_steps_and_completes(client):
    payload = {
        "url": "https://example.com/tscheck-catalogo",
        "objective": "tscheck-visual: mapear jornada simulada de navegacao",
    }
    resp = client.post("/visual/missions", json=payload)
    assert resp.status_code == 200, resp.text
    mission = resp.json()
    mission_id = mission["id"]
    assert mission["mode"] == "simulated"
    assert len(mission["steps"]) == 4
    assert mission["url"] == payload["url"]

    # poll until the simulated run (~3s) completes
    final = mission
    for _ in range(20):
        final = client.get(f"/visual/missions/{mission_id}").json()
        if final["status"] in ("completed", "failed"):
            break
        time.sleep(1)

    assert final["status"] == "completed", final
    assert len(final["steps"]) == 4
    assert all(step["status"] == "completed" for step in final["steps"])
    assert "MODO SIMULADO" in (final["result"] or "")

    # GET by id persists the record after "reload"
    reget = client.get(f"/visual/missions/{mission_id}")
    assert reget.status_code == 200
    assert reget.json()["id"] == mission_id

    # the completed delivery is published to the Room, labelled simulated
    room = client.get("/room/messages").json()
    assert any(
        "Navegador Visual" in (m.get("content") or "") and "MODO SIMULADO" in (m.get("content") or "")
        for m in room
    ), "expected a Room message announcing the simulated visual delivery"


def test_visual_mission_invalid_url_rejected(client):
    resp = client.post(
        "/visual/missions",
        json={"url": "not-a-url", "objective": "tscheck-visual objetivo valido"},
    )
    assert resp.status_code == 422, resp.text


def test_visual_mission_missing_id_404(client):
    resp = client.get("/visual/missions/tscheck-visual-does-not-exist")
    assert resp.status_code == 404
