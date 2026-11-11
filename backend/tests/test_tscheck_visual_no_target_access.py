"""Criterion: no simulated action accesses the target host.

The simulator module must not import any HTTP client (only urlparse to extract
the host), and a mission against a .invalid host must still complete fast and
cleanly (no DNS/network attempt), with outputs explicitly marked synthetic.
"""

import time
from pathlib import Path


def test_visual_module_has_no_http_client_import():
    source = (Path(__file__).parent.parent / "routers" / "visual.py").read_text()
    for banned in ("import requests", "import httpx", "import aiohttp", "urllib.request"):
        assert banned not in source, f"visual.py must not import an HTTP client ({banned} found)"
    assert "urlparse" in source


def test_invalid_host_mission_completes_without_network_access(client):
    payload = {
        "url": "https://tscheck-target.invalid/secure-area",
        "objective": "tscheck-visual: nao deve acessar o host alvo invalido",
        "action_types": ["open", "read", "copy"],
    }
    resp = client.post("/visual/missions", json=payload)
    assert resp.status_code == 200, resp.text
    mission = resp.json()
    mission_id = mission["id"]

    final = mission
    for _ in range(20):
        final = client.get(f"/visual/missions/{mission_id}").json()
        if final["status"] in ("completed", "failed"):
            break
        time.sleep(1)

    # Because nothing ever dials the host, a bogus .invalid domain completes
    # just as fast and cleanly as a real one -- no DNS error, no timeout.
    assert final["status"] == "completed", final
    assert "MODO SIMULADO" in (final["result"] or "")
    assert "tscheck-target.invalid" in final["result"]
    for action in final["actions"]:
        assert "simulad" in action["output"].lower() or "sintético".lower() in action["output"].lower() or "sintetico" in action["output"].lower()
