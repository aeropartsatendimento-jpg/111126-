"""Criterion: channels persist config and search degrades safely (results or empty list, never 500)."""


def test_channel_config_persists(client):
    channels = client.get("/channels").json()
    assert channels, "expected seeded channels"
    whatsapp = next((c for c in channels if c["key"] == "whatsapp"), channels[0])
    cid = whatsapp["id"]

    resp = client.patch(f"/channels/{cid}", json={"config": {"phone": "tscheck-555-0100"}})
    assert resp.status_code == 200, resp.text
    assert resp.json()["config"].get("phone") == "tscheck-555-0100"

    got = client.get("/channels").json()
    updated = next(c for c in got if c["id"] == cid)
    assert updated["config"].get("phone") == "tscheck-555-0100"


def test_channel_update_invalid_status_rejected(client):
    channels = client.get("/channels").json()
    cid = channels[0]["id"]
    resp = client.patch(f"/channels/{cid}", json={"status": "weird"})
    assert resp.status_code == 422


def test_internet_search_degrades_safely(client):
    resp = client.post("/channels/internet/search", json={"query": "tscheck aeropartz pecas"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body["results"], list)
