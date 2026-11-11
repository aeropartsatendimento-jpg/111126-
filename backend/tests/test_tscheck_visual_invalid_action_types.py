"""Criterion: the API rejects invalid action plans.

Unknown action type, empty list, and duplicated types must all return 422 and
must not create a mission. Runs alongside other test modules under xdist, so
we assert on the absence of *this test's own* fixture URL rather than a
global mission count.
"""


def _url_exists(client, url: str) -> bool:
    return any(m["url"] == url for m in client.get("/visual/missions").json())


def test_unknown_action_type_rejected(client):
    url = "https://example.com/tscheck-invalid-type"
    resp = client.post(
        "/visual/missions",
        json={
            "url": url,
            "objective": "tscheck-visual: tipo de acao desconhecido",
            "action_types": ["open", "teleport"],
        },
    )
    assert resp.status_code == 422, resp.text
    assert not _url_exists(client, url)


def test_empty_action_list_rejected(client):
    url = "https://example.com/tscheck-empty-plan"
    resp = client.post(
        "/visual/missions",
        json={
            "url": url,
            "objective": "tscheck-visual: lista de acoes vazia",
            "action_types": [],
        },
    )
    assert resp.status_code == 422, resp.text
    assert not _url_exists(client, url)


def test_duplicate_action_types_rejected(client):
    url = "https://example.com/tscheck-dup-plan"
    resp = client.post(
        "/visual/missions",
        json={
            "url": url,
            "objective": "tscheck-visual: tipos de acao duplicados",
            "action_types": ["open", "read", "open"],
        },
    )
    assert resp.status_code == 422, resp.text
    assert not _url_exists(client, url)
