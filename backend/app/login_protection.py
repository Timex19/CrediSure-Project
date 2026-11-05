"""Bound login admission, body reads and expensive password work before parsing."""

import asyncio
import math
import time
from collections import deque
from threading import BoundedSemaphore, Lock

from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import Settings


class LoginLimiter:
    """Process-local sliding windows; no user-supplied account lockouts."""

    def __init__(self, per_ip: int, total: int, window: int) -> None:
        self.per_ip = per_ip
        self.total = total
        self.window = window
        self.attempts: deque[tuple[float, str]] = deque()
        self.lock = Lock()

    def check(self, key: str) -> int:
        now = time.monotonic()
        with self.lock:
            while self.attempts and self.attempts[0][0] <= now - self.window:
                self.attempts.popleft()
            # The global cap also bounds memory and the cost of this scan.
            matches = [stamp for stamp, address in self.attempts if address == key]
            oldest = None
            if len(self.attempts) >= self.total:
                oldest = self.attempts[0][0]
            if len(matches) >= self.per_ip:
                oldest = max(oldest or matches[0], matches[0])
            if oldest is not None:
                return max(1, math.ceil(oldest + self.window - now))
            self.attempts.append((now, key))
            return 0


class LoginProtection:
    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app = app
        self.settings = settings
        self.limiter = LoginLimiter(
            settings.login_attempts_per_ip,
            settings.login_attempts_total,
            settings.login_window_seconds,
        )
        self.slots = BoundedSemaphore(settings.login_concurrency)

    async def reject(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
        status: int,
        code: str,
        message: str,
        retry: int = 0,
    ) -> None:
        headers = {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
        }
        if retry:
            headers["Retry-After"] = str(retry)
        await JSONResponse(
            {"error": {"code": code, "message": message}},
            status_code=status,
            headers=headers,
        )(scope, receive, send)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] != "http"
            or scope["method"] != "POST"
            or scope["path"].rstrip("/") != "/api/auth/login"
        ):
            await self.app(scope, receive, send)
            return
        client = scope.get("client")
        retry = self.limiter.check(client[0] if client else "local")
        if retry:
            await self.reject(
                scope,
                receive,
                send,
                429,
                "rate_limited",
                f"Too many sign-in attempts. Try again in {retry} seconds.",
                retry,
            )
            return
        if not self.slots.acquire(blocking=False):
            await self.reject(
                scope,
                receive,
                send,
                429,
                "rate_limited",
                "Sign-in is busy. Try again in 1 second.",
                1,
            )
            return
        try:
            headers = Headers(scope=scope)
            if headers.get("content-encoding", "identity").lower() != "identity":
                await self.reject(
                    scope,
                    receive,
                    send,
                    415,
                    "unsupported_media_type",
                    "Send an uncompressed JSON request.",
                )
                return
            content_type = (
                headers.get("content-type", "").split(";", 1)[0].strip().lower()
            )
            if content_type != "application/json":
                await self.reject(
                    scope,
                    receive,
                    send,
                    415,
                    "unsupported_media_type",
                    "Send a JSON request.",
                )
                return
            body = bytearray()
            try:
                async with asyncio.timeout(self.settings.login_body_timeout_seconds):
                    while True:
                        message = await receive()
                        if message["type"] == "http.disconnect":
                            return
                        chunk = message.get("body", b"")
                        if len(body) + len(chunk) > self.settings.login_body_bytes:
                            await self.reject(
                                scope,
                                receive,
                                send,
                                413,
                                "request_too_large",
                                "Sign-in request is too large.",
                            )
                            return
                        body.extend(chunk)
                        if not message.get("more_body", False):
                            break
            except TimeoutError:
                await self.reject(
                    scope,
                    receive,
                    send,
                    408,
                    "request_timeout",
                    "Sign-in request took too long. Please try again.",
                )
                return

            delivered = False

            async def buffered_receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {
                        "type": "http.request",
                        "body": bytes(body),
                        "more_body": False,
                    }
                return await receive()

            await self.app(scope, buffered_receive, send)
        finally:
            self.slots.release()
