"""Verify health and the browser-origin configuration boundary."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.database import initialize
from app.main import create_app


@pytest.fixture
def client(tmp_path):
    settings = Settings(
        _env_file=None,
        allowed_origins=["http://localhost:5173"],
        database_path=tmp_path / "test.sqlite3",
    )
    initialize(settings.database_path)
    with TestClient(create_app(settings)) as test_client:
        yield test_client


def test_health_is_available_without_authentication(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["cache-control"] == "no-store"


def test_allowed_origin_can_preflight_authorization(client):
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-credentials" not in response.headers


def test_unlisted_origin_is_not_granted_browser_access(client):
    response = client.options(
        "/api/health",
        headers={
            "Origin": "https://unlisted.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


@pytest.mark.parametrize(
    "origin",
    ["*", "https://*.example.com", "https://example.com/path", "not-a-url"],
)
def test_invalid_origins_fail_configuration_validation(origin):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, allowed_origins=[origin])


def test_origins_load_from_environment(monkeypatch):
    monkeypatch.setenv("CREDISURE_ALLOWED_ORIGINS", '["https://dashboard.example"]')

    settings = Settings(_env_file=None)

    assert [str(origin) for origin in settings.allowed_origins] == [
        "https://dashboard.example/"
    ]
