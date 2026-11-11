"""Criterion: projects can be resumed and edited."""


def test_project_edit_persists_and_resume_creates_mission(client):
    create = client.post("/projects", json={"name": "tscheck-project-resume", "objective": "validar fluxo"})
    assert create.status_code == 200, create.text
    project = create.json()
    pid = project["id"]

    patch = client.patch(f"/projects/{pid}", json={
        "in_progress": "tscheck em andamento",
        "next_step": "tscheck proximo passo",
        "blocker": "tscheck bloqueio",
    })
    assert patch.status_code == 200, patch.text
    updated = patch.json()
    assert updated["in_progress"] == "tscheck em andamento"
    assert updated["next_step"] == "tscheck proximo passo"
    assert updated["blocker"] == "tscheck bloqueio"

    got = client.get(f"/projects/{pid}")
    assert got.status_code == 200
    assert got.json()["in_progress"] == "tscheck em andamento"

    resume = client.post(f"/projects/{pid}/resume")
    assert resume.status_code == 200, resume.text
    mission = resume.json()
    assert mission["project_id"] == pid


def test_project_update_invalid_status_rejected(client):
    create = client.post("/projects", json={"name": "tscheck-project-badstatus"})
    pid = create.json()["id"]
    resp = client.patch(f"/projects/{pid}", json={"status": "not-a-status"})
    assert resp.status_code == 422
