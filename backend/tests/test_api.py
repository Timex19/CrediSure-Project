import secrets
import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.auth import token_hash
from app.config import Settings
from app.database import connect
from app.main import create_app
from app.seed import seed


@pytest.fixture
def setup(tmp_path):
    password = secrets.token_urlsafe(20)
    settings = Settings(
        _env_file=None,
        database_path=tmp_path / "test.sqlite3",
        admin_email="evaluator@example.com",
        admin_password=SecretStr(password),
    )
    seed(settings)
    with TestClient(create_app(settings)) as client:
        yield client, settings, password


def sign_in(setup):
    client, _, password = setup
    response = client.post(
        "/api/auth/login", json={"email": "evaluator@example.com", "password": password}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, token


def test_session_expiry_revocation_and_hash_storage(setup):
    client, settings, _ = setup
    headers, token = sign_in(setup)
    with connect(settings.database_path) as database:
        row = database.execute("SELECT * FROM sessions").fetchone()
        assert row["token_hash"] == token_hash(token)
        assert token not in str(dict(row))
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/users", headers=headers).status_code == 401
    headers, token = sign_in(setup)
    with connect(settings.database_path) as database:
        database.execute("UPDATE sessions SET expires_at = ?", (int(time.time()) - 1,))
    assert client.get("/api/dashboard/summary", headers=headers).status_code == 401


def test_credentials_errors_are_generic_and_protected_routes_require_auth(setup):
    client, _, _ = setup
    responses = [
        client.post("/api/auth/login", json={"email": email, "password": "incorrect"})
        for email in ("evaluator@example.com", "absent@example.com")
    ]
    assert responses[0].json() == responses[1].json()
    assert responses[0].status_code == 401
    for path in ("/api/users", "/api/dashboard/summary", "/api/auth/me"):
        assert client.get(path).status_code == 401
        assert (
            client.get(path, headers={"Authorization": "Bearer invalid"}).status_code
            == 401
        )


def test_filter_pagination_counts_order_and_public_fields(setup):
    client, _, _ = setup
    headers, _ = sign_in(setup)
    summary = client.get("/api/dashboard/summary", headers=headers).json()
    assert summary == {
        "total_users": 80,
        "active_users": 48,
        "inactive_users": 16,
        "pending_users": 16,
    }
    first = client.get("/api/users?page_size=10", headers=headers).json()
    second = client.get("/api/users?page=2", headers=headers).json()
    assert first["total"] == 80 and first["total_pages"] == 8
    assert len(first["items"]) == 10
    assert not {u["id"] for u in first["items"]} & {u["id"] for u in second["items"]}
    assert first["items"][0]["joined_date"] >= first["items"][-1]["joined_date"]
    assert set(first["items"][0]) == {
        "id",
        "full_name",
        "email",
        "role",
        "status",
        "joined_date",
    }
    filtered = client.get(
        "/api/users",
        params={"search": "  AMARA  ", "status": "active"},
        headers=headers,
    ).json()
    assert filtered["total"] > 0
    assert all(
        "amara" in u["full_name"].lower() and u["status"] == "active"
        for u in filtered["items"]
    )
    for term in ("%", "_", "' OR 1=1 --", "no-such-user"):
        assert (
            client.get("/api/users", params={"search": term}, headers=headers).json()[
                "total"
            ]
            == 0
        )
    assert client.get("/api/users?page=100", headers=headers).json()["items"] == []


@pytest.mark.parametrize(
    "query",
    [
        "status=unknown",
        "page=0",
        "page_size=11",
        "page_size=500",
        "search=" + "a" * 101,
    ],
)
def test_invalid_query_is_normalized(setup, query):
    client, _, _ = setup
    headers, _ = sign_in(setup)
    response = client.get("/api/users?" + query, headers=headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert response.headers["cache-control"] == "no-store"


def test_empty_data_and_seed_idempotence(setup):
    client, settings, _ = setup
    seed(settings)
    headers, _ = sign_in(setup)
    assert client.get("/api/users", headers=headers).json()["total"] == 80
    with connect(settings.database_path) as database:
        database.execute("DELETE FROM users")
    assert not any(
        client.get("/api/dashboard/summary", headers=headers).json().values()
    )
    result = client.get("/api/users", headers=headers).json()
    assert result["items"] == [] and result["total_pages"] == 0


def test_health_requires_initialized_database(tmp_path):
    settings = Settings(_env_file=None, database_path=tmp_path / "missing.sqlite3")
    with TestClient(create_app(settings)) as client:
        response = client.get("/api/health")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "unavailable"


def test_login_throttle(setup):
    client, _, _ = setup
    for _ in range(10):
        assert (
            client.post(
                "/api/auth/login",
                json={"email": "unknown@example.com", "password": "wrong"},
            ).status_code
            == 401
        )
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "unknown@example.com", "password": "wrong"},
        ).status_code
        == 429
    )


def test_parallel_protected_requests_use_independent_connections(setup):
    client, _, _ = setup
    headers, _ = sign_in(setup)
    with ThreadPoolExecutor(max_workers=6) as pool:
        responses = list(
            pool.map(
                lambda _: client.get("/api/users?page_size=25", headers=headers),
                range(18),
            )
        )
    assert all(response.status_code == 200 for response in responses)
    assert all(len(response.json()["items"]) == 25 for response in responses)
