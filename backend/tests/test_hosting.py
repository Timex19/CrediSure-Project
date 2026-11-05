"""Hosted configuration boundaries; live PostgreSQL coverage is opt-in below."""

import os
import secrets
from unittest.mock import MagicMock
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

import psycopg
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError

from app import database, serve
from app.config import Settings
from app.database import DatabaseConnection, connect, initialize
from app.main import create_app
from app.reset_admin import reset_admin
from app.seed import seed


@pytest.mark.parametrize(
    "url", ["sqlite:///file", "https://db.example", "postgresql://"]
)
def test_database_url_rejects_other_backends(url):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url=SecretStr(url))


def test_postgres_binding_keeps_values_out_of_sql():
    connection = MagicMock(spec=psycopg.Connection)
    adapter = DatabaseConnection(connection)
    dangerous = "' OR 1=1 -- :id %"
    adapter.execute("SELECT id FROM users WHERE email = :email", {"email": dangerous})
    connection.execute.assert_called_once_with(
        "SELECT id FROM users WHERE email = %(email)s", {"email": dangerous}
    )
    with pytest.raises(TypeError):
        adapter.execute("SELECT id FROM users WHERE id = ?", (1,))
    connection.reset_mock()
    adapter.begin_read()
    connection.execute.assert_not_called()
    adapter.lock_administrators()
    connection.execute.assert_called_once_with(
        "LOCK TABLE administrators IN EXCLUSIVE MODE"
    )


def test_postgres_connections_require_tls_and_bound_waits(monkeypatch):
    factory = MagicMock()
    connection = MagicMock(spec=psycopg.Connection)
    factory.return_value.__enter__.return_value = connection
    monkeypatch.setattr(database.psycopg, "connect", factory)
    settings = Settings(
        _env_file=None, database_url=SecretStr("postgresql://db.example/test")
    )
    with connect(settings):
        pass
    assert factory.call_args.kwargs["sslmode"] == "require"
    assert factory.call_args.kwargs["connect_timeout"] == 5
    assert "statement_timeout=5000" in factory.call_args.kwargs["options"]
    assert connection.isolation_level == psycopg.IsolationLevel.READ_COMMITTED
    with connect(settings, snapshot=True):
        pass
    assert connection.isolation_level == psycopg.IsolationLevel.REPEATABLE_READ
    assert "db.example" not in repr(settings)
    settings.database_url = SecretStr(
        "postgresql://db.example/test?sslmode=verify-full"
    )
    with connect(settings):
        pass
    assert factory.call_args.kwargs["sslmode"] == "verify-full"
    settings.database_url = SecretStr("postgresql://db.example/test?sslmode=disable")
    with pytest.raises(ValueError, match="require TLS"), connect(settings):
        pass


def test_hosted_startup_refuses_ephemeral_storage_and_hides_driver_details(monkeypatch):
    settings = Settings(_env_file=None)
    monkeypatch.setattr(serve, "Settings", lambda: settings)
    start = MagicMock()
    monkeypatch.setattr(serve.uvicorn, "run", start)
    with pytest.raises(SystemExit, match="requires CREDISURE_DATABASE_URL"):
        serve.main()
    settings.database_url = SecretStr("postgresql://db.example/test")
    monkeypatch.setattr(
        serve,
        "seed",
        MagicMock(side_effect=psycopg.OperationalError("private connection details")),
    )
    with pytest.raises(SystemExit) as error:
        serve.main()
    assert "private" not in str(error.value)
    start.assert_not_called()


def test_hosted_startup_seeds_before_starting_one_worker(monkeypatch):
    settings = Settings(
        _env_file=None, database_url=SecretStr("postgresql://db.example/test")
    )
    monkeypatch.setattr(serve, "Settings", lambda: settings)
    monkeypatch.setenv("PORT", "9876")
    order = []
    monkeypatch.setattr(serve, "seed", lambda _: order.append("seed"))

    def start(*args, **kwargs):
        assert order == ["seed"]
        assert kwargs["port"] == 9876
        assert kwargs["workers"] == 1
        assert kwargs["proxy_headers"] is False

    monkeypatch.setattr(serve.uvicorn, "run", start)
    serve.main()


@pytest.mark.skipif(
    not os.environ.get("CREDISURE_TEST_POSTGRES_URL"),
    reason="No isolated PostgreSQL test service configured",
)
def test_postgres_api_contract():
    """Use a unique schema; never seed or modify existing application tables."""
    url = os.environ["CREDISURE_TEST_POSTGRES_URL"]
    schema = "test_" + secrets.token_hex(12)
    # Test services must support TLS just like the hosted application.
    with psycopg.connect(url, sslmode="require", autocommit=True) as management:
        management.execute(
            psycopg.sql.SQL("CREATE SCHEMA {}").format(psycopg.sql.Identifier(schema))
        )
        try:
            password = secrets.token_urlsafe(24)
            parts = urlsplit(url)
            query = dict(parse_qsl(parts.query))
            query["options"] = f"-c search_path={schema}"
            isolated_url = urlunsplit(
                parts._replace(query=urlencode(query, quote_via=quote))
            )
            settings = Settings(
                _env_file=None,
                database_url=SecretStr(isolated_url),
                admin_email="evaluator@example.com",
                admin_password=SecretStr(password),
            )
            with connect(settings) as db:
                assert (
                    db.execute("SELECT current_schema() AS schema").fetchone()["schema"]
                    == schema
                )
            initialize(settings)
            seed(settings)
            seed(settings)
            with TestClient(create_app(settings)) as client:
                assert client.get("/api/health").status_code == 200
                response = client.post(
                    "/api/auth/login",
                    json={"email": str(settings.admin_email), "password": password},
                )
                assert response.status_code == 200
                headers = {"Authorization": "Bearer " + response.json()["access_token"]}
                assert client.get("/api/dashboard/summary", headers=headers).json() == {
                    "total_users": 80,
                    "active_users": 48,
                    "inactive_users": 16,
                    "pending_users": 16,
                }
                filtered = client.get(
                    "/api/users?search=AMARA&status=active", headers=headers
                ).json()
                assert filtered["total"] == 1
                assert filtered["items"][0]["full_name"] == "Amara Okafor"
                for term in ("%", "_", "\\", "' OR 1=1 --"):
                    assert (
                        client.get(
                            "/api/users", params={"search": term}, headers=headers
                        ).json()["total"]
                        == 0
                    )
                assert (
                    len(
                        client.get("/api/users?page=2", headers=headers).json()["items"]
                    )
                    == 10
                )
                assert (
                    client.post("/api/auth/logout", headers=headers).status_code == 204
                )
                assert client.get("/api/auth/me", headers=headers).status_code == 401
                response = client.post(
                    "/api/auth/login",
                    json={"email": str(settings.admin_email), "password": password},
                )
                headers = {"Authorization": "Bearer " + response.json()["access_token"]}
                settings.admin_password = SecretStr(secrets.token_urlsafe(24))
                reset_admin(settings)
                assert client.get("/api/auth/me", headers=headers).status_code == 401
                with connect(settings) as db:
                    assert (
                        db.execute("SELECT COUNT(*) AS total FROM users").fetchone()[
                            "total"
                        ]
                        == 80
                    )
        finally:
            management.execute(
                psycopg.sql.SQL("DROP SCHEMA {} CASCADE").format(
                    psycopg.sql.Identifier(schema)
                )
            )
