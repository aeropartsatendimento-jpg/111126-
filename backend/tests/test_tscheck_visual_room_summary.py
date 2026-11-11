"""Criterion: the Room delivery summarizes only the chosen actions.

A mission created with a subset of actions must publish a Room message that
lists the count and names of exactly the selected actions, and stays labelled
MODO SIMULADO.
"""

import time

SUBSET = ["open", "write", "copy"]
LABELS = {
    "open": "Abrir página",
    "write": "Escrever",
    "copy": "Copiar",
}
EXCLUDED_LABELS = {"read": "Ler conteúdo", "click": "Clicar", "paste": "Colar"}


def test_room_summary_lists_only_selected_actions(client):
    payload = {
        "url": "https://example.com/tscheck-room-summary",
        "objective": "tscheck-visual: resumo na sala deve citar somente as acoes escolhidas",
        "action_types": SUBSET,
    }
    resp = client.post("/visual/missions", json=payload)
    assert resp.status_code == 200, resp.text
    mission = resp.json()
    mission_id = mission["id"]
    assert len(mission["actions"]) == 3

    final = mission
    for _ in range(20):
        final = client.get(f"/visual/missions/{mission_id}").json()
        if final["status"] in ("completed", "failed"):
            break
        time.sleep(1)
    assert final["status"] == "completed", final
    result = final["result"] or ""
    assert "MODO SIMULADO" in result
    assert "3" in result
    for label in LABELS.values():
        assert label in result, f"expected selected action '{label}' in result: {result}"

    room = client.get("/room/messages").json()
    matches = [
        m for m in room
        if "Navegador Visual" in (m.get("content") or "") and "MODO SIMULADO" in (m.get("content") or "")
        and mission["objective"][:40] in (m.get("content") or "")
    ]
    assert matches, "expected a Room message announcing this mission's simulated delivery"
    content = matches[-1]["content"]
    assert "3" in content
    for label in LABELS.values():
        assert label in content
    # the action-plan sentence must name only the 3 chosen actions, not the excluded ones
    plan_sentence = content.split("ação(ões) simulada(s): ", 1)[-1].split(".\n", 1)[0]
    for excluded in EXCLUDED_LABELS.values():
        assert excluded not in plan_sentence, f"'{excluded}' should not be in plan sentence: {plan_sentence}"
