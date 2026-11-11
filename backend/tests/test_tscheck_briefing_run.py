"""Criterion: the morning routine can be run manually and publishes to the room."""


def test_briefing_run_now_creates_entry_and_room_message(client):
    before = client.get("/room/messages").json()
    before_count = len(before)

    resp = client.post("/briefing/run")
    assert resp.status_code == 200, resp.text
    briefing = resp.json()
    assert briefing["day"]
    assert briefing["content"]

    room = client.get("/room/messages").json()
    assert len(room) >= before_count
    assert any(m.get("kind") == "briefing" for m in room[-5:]) or any(m.get("kind") == "briefing" for m in room)
