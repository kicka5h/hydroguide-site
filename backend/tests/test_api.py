"""Tests for API endpoints."""

import pytest
import pytest_asyncio

from app.config import settings


@pytest.mark.asyncio
class TestHealthEndpoint:
    async def test_health_returns_ok(self, client):
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "hydroguide-api"


@pytest.mark.asyncio
class TestExampleConfig:
    async def test_returns_example(self, client):
        resp = await client.get("/api/v1/config/example")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "example"
        assert data["data"]["solar"]["panel_wattage_wp"] == 425
        assert len(data["data"]["power_budget"]) == 10


@pytest.mark.asyncio
class TestConfigCrud:
    async def test_create_config(self, client):
        resp = await client.post(
            "/api/v1/configs",
            json={"name": "Test", "data": {}},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test"
        assert "id" in data

    async def test_list_configs(self, client):
        # Create two configs
        await client.post("/api/v1/configs", json={"name": "A", "data": {}})
        await client.post("/api/v1/configs", json={"name": "B", "data": {}})

        resp = await client.get("/api/v1/configs")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    async def test_get_config_by_id(self, client):
        create_resp = await client.post(
            "/api/v1/configs",
            json={"name": "Fetch Me", "data": {}},
        )
        config_id = create_resp.json()["id"]

        resp = await client.get(f"/api/v1/configs/{config_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Fetch Me"

    async def test_update_config(self, client):
        create_resp = await client.post(
            "/api/v1/configs",
            json={"name": "Original", "data": {}},
        )
        config_id = create_resp.json()["id"]

        resp = await client.put(
            f"/api/v1/configs/{config_id}",
            json={"name": "Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated"

    async def test_delete_config(self, client):
        create_resp = await client.post(
            "/api/v1/configs",
            json={"name": "Delete Me", "data": {}},
        )
        config_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/v1/configs/{config_id}")
        assert resp.status_code == 204

        resp = await client.get(f"/api/v1/configs/{config_id}")
        assert resp.status_code == 404

    async def test_get_nonexistent_config_returns_404(self, client):
        resp = await client.get("/api/v1/configs/nonexistent-id")
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestExcelImport:
    async def test_import_excel(self, client, excel_bytes):
        resp = await client.post(
            "/api/v1/configs/import-excel",
            files={"file": ("Solar_calculator.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["config"]["power_budget"]) == 10
        assert data["energy_balance"] is not None
        assert len(data["energy_balance"]["monthly"]) == 12
        assert data["recommended_config"]["communication"] == "Satellite modem"

    async def test_import_rejects_non_excel(self, client):
        resp = await client.post(
            "/api/v1/configs/import-excel",
            files={"file": ("test.txt", b"not excel", "text/plain")},
        )
        assert resp.status_code == 400


@pytest.mark.asyncio
class TestAnalyzeEndpoint:
    async def test_analyze_requires_auth(self, client):
        resp = await client.post(
            "/api/v1/analyze",
            json={"config": {}},
        )
        assert resp.status_code == 401

    async def test_analyze_with_simple_token(self, client):
        resp = await client.post(
            "/api/v1/analyze",
            json={"config": {
                "power_budget": [
                    {"name": "Sensor", "power_w": 0.05, "consumption_wh_day": 1.2}
                ],
            }},
            headers={"Authorization": f"Bearer {settings.api_bearer_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data
        assert "recommendations" in data
        assert data["daily_energy_wh"] == pytest.approx(1.2)

    async def test_analyze_caches_result(self, client):
        config_json = {"config": {
            "power_budget": [
                {"name": "Logger", "power_w": 7, "consumption_wh_day": 168}
            ],
        }}
        headers = {"Authorization": f"Bearer {settings.api_bearer_token}"}

        # First call
        resp1 = await client.post("/api/v1/analyze", json=config_json, headers=headers)
        assert resp1.status_code == 200
        assert resp1.json()["cached"] is False

        # Second call with same config should be cached
        resp2 = await client.post("/api/v1/analyze", json=config_json, headers=headers)
        assert resp2.status_code == 200
        assert resp2.json()["cached"] is True

    async def test_analyze_invalid_token_returns_401(self, client):
        resp = await client.post(
            "/api/v1/analyze",
            json={"config": {}},
            headers={"Authorization": "Bearer wrong-token"},
        )
        assert resp.status_code == 401
