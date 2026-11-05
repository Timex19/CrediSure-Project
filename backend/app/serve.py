"""Render entry point: initialize durable storage, then start one API worker."""

import os

import uvicorn

from app.config import Settings
from app.database import DATABASE_ERRORS
from app.seed import seed


def main() -> None:
    settings = Settings()
    if settings.database_url is None:
        raise SystemExit("Hosted startup requires CREDISURE_DATABASE_URL (PostgreSQL).")
    port = int(os.environ.get("PORT", "8000"))
    if not 1 <= port <= 65535:
        raise SystemExit("PORT must be between 1 and 65535.")
    try:
        seed(settings)
    except DATABASE_ERRORS:
        # Driver exceptions may contain connection details. Do not print them.
        raise SystemExit(
            "Database initialization failed. Check database access."
        ) from None
    except ValueError as error:
        raise SystemExit(str(error)) from None
    uvicorn.run(
        "app.main:create_app",
        factory=True,
        host="0.0.0.0",
        port=port,
        workers=1,
        proxy_headers=False,
        server_header=False,
    )


if __name__ == "__main__":
    main()
