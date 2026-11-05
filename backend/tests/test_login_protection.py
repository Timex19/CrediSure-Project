"""Exercise admission before parsing and bound actual streamed login bodies."""

import asyncio
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app import login_protection
from app.config import Settings
from app.database import initialize
from app.login_protection import LoginLimiter, LoginProtection
from app.main import create_app


def test_sliding_windows_are_bounded_and_recover(monkeypatch):
    clock = Mock(return_value=100.0)
    monkeypatch.setattr(login_protection.time, "monotonic", clock)
    limiter = LoginLimiter(per_ip=2, total=3, window=60)
    assert limiter.check("one") == 0
    clock.return_value = 101.1
    assert limiter.check("one") == 0
    assert limiter.check("one") == 59
    assert limiter.check("two") == 0
    for i in range(1000):
        assert limiter.check(f"other-{i}") == 59
    assert len(limiter.attempts) == 3
    clock.return_value = 160.0
    assert limiter.check("one") == 0
    assert limiter.check("one") == 2
    clock.return_value = 222.0
    assert limiter.check("one") == 0
    assert len(limiter.attempts) == 1


def test_malformed_and_trailing_slash_requests_are_throttled_before_database(tmp_path):
    settings = Settings(_env_file=None, database_path=tmp_path / "missing.sqlite3")
    with TestClient(create_app(settings)) as client:
        for i in range(10):
            response = client.post(
                "/api/auth/login" + ("/" if i % 2 else ""),
                content="not json",
                headers={
                    "Content-Type": "text/plain",
                    "X-Forwarded-For": f"192.0.2.{i}",
                },
                follow_redirects=False,
            )
            assert response.status_code == 415
        response = client.post("/api/auth/login", json={})
        assert response.status_code == 429
        assert 1 <= int(response.headers["retry-after"]) <= 60
        assert response.headers["cache-control"] == "no-store"
        assert response.headers["x-content-type-options"] == "nosniff"
        assert client.get("/api/health").status_code == 503


def test_invalid_json_counts_and_rate_limit_keeps_cors_headers(tmp_path):
    settings = Settings(
        _env_file=None,
        database_path=tmp_path / "test.sqlite3",
        allowed_origins=["https://dashboard.example"],
        login_attempts_per_ip=2,
    )
    initialize(settings.database_path)
    with TestClient(create_app(settings)) as client:
        headers = {
            "Content-Type": "application/json",
            "Origin": "https://dashboard.example",
        }
        for _ in range(2):
            assert (
                client.post("/api/auth/login", content="{", headers=headers).status_code
                == 422
            )
        response = client.post("/api/auth/login", content="{", headers=headers)
        assert response.status_code == 429
        assert (
            response.headers["access-control-allow-origin"]
            == "https://dashboard.example"
        )


@pytest.mark.parametrize(
    ("headers", "body", "status"),
    [
        ({"Content-Type": "application/json"}, b"x" * 8193, 413),
        ({"Content-Type": "application/json", "Content-Encoding": "gzip"}, b"{}", 415),
        ({"Content-Type": "text/plain"}, b"{}", 415),
    ],
)
def test_rejected_bodies_do_not_reach_password_verification(headers, body, status):
    with TestClient(create_app(Settings(_env_file=None))) as client:
        response = client.post("/api/auth/login", content=body, headers=headers)
        assert response.status_code == status
        assert "x" * 50 not in response.text


def scope():
    return {
        "type": "http",
        "method": "POST",
        "path": "/api/auth/login",
        "headers": [(b"content-type", b"application/json")],
        "client": ("192.0.2.1", 1234),
    }


def test_streamed_body_limit_ignores_declared_length_and_releases_slot():
    async def run():
        called = False

        async def downstream(scope, receive, send):
            nonlocal called
            called = True
            assert (await receive())["body"] == b"{}"

        middleware = LoginProtection(
            downstream, Settings(_env_file=None, login_concurrency=1)
        )
        messages = iter(
            [
                {"type": "http.request", "body": b"x" * 4096, "more_body": True},
                {"type": "http.request", "body": b"x" * 4097, "more_body": False},
            ]
        )
        sent = []

        async def receive():
            return next(messages)

        async def send(message):
            sent.append(message)

        request_scope = scope()
        request_scope["headers"].append((b"content-length", b"2"))
        await middleware(request_scope, receive, send)
        assert sent[0]["status"] == 413
        assert not called

        async def valid():
            return {"type": "http.request", "body": b"{}"}

        await middleware(scope(), valid, send)
        assert called

    asyncio.run(run())


def test_concurrency_rejects_without_reading_and_recovers_after_exception():
    async def run():
        entered, finish = asyncio.Event(), asyncio.Event()

        async def downstream(scope, receive, send):
            entered.set()
            await finish.wait()
            raise RuntimeError("test downstream failure")

        middleware = LoginProtection(
            downstream, Settings(_env_file=None, login_concurrency=1)
        )

        async def receive():
            return {"type": "http.request", "body": b"{}"}

        sent = []

        async def send(message):
            sent.append(message)

        first = asyncio.create_task(middleware(scope(), receive, send))
        await entered.wait()

        async def unread():
            pytest.fail("Overload must be rejected before reading a body")

        await middleware(scope(), unread, send)
        assert sent[0]["status"] == 429
        finish.set()
        with pytest.raises(RuntimeError):
            await first
        assert middleware.slots.acquire(blocking=False)
        middleware.slots.release()

    asyncio.run(run())


def test_slow_body_times_out_and_disconnect_releases_capacity(monkeypatch):
    real_timeout = asyncio.timeout
    monkeypatch.setattr(
        login_protection.asyncio, "timeout", lambda _: real_timeout(0.01)
    )

    async def run():
        async def downstream(scope, receive, send):
            pytest.fail("Incomplete bodies must not reach authentication")

        middleware = LoginProtection(
            downstream, Settings(_env_file=None, login_concurrency=1)
        )
        sent = []

        async def send(message):
            sent.append(message)

        async def slow():
            await asyncio.Event().wait()

        await middleware(scope(), slow, send)
        assert sent[0]["status"] == 408

        async def disconnected():
            return {"type": "http.disconnect"}

        await middleware(scope(), disconnected, send)
        assert middleware.slots.acquire(blocking=False)
        middleware.slots.release()

    asyncio.run(run())
