"""Criterion: the AeroPartz panel can manage items (create, toggle status, remove)."""


def test_store_item_create_update_delete(client):
    create = client.post("/store/items", json={
        "kind": "stock", "title": "tscheck-item", "detail": "peca de teste", "value": "10", "status": "ok",
    })
    assert create.status_code == 200, create.text
    item = create.json()
    iid = item["id"]
    assert item["is_sample"] is False

    update = client.patch(f"/store/items/{iid}", json={"status": "critical"})
    assert update.status_code == 200, update.text
    assert update.json()["status"] == "critical"

    listed = client.get("/store/items").json()
    assert any(i["id"] == iid for i in listed)

    delete = client.delete(f"/store/items/{iid}")
    assert delete.status_code == 204

    listed_after = client.get("/store/items").json()
    assert not any(i["id"] == iid for i in listed_after)


def test_store_item_invalid_status_for_kind_rejected(client):
    resp = client.post("/store/items", json={"kind": "stock", "title": "tscheck-bad", "status": "open"})
    assert resp.status_code == 422
