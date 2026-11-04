"""FastAPI application factory."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.auth import LoginLimiter
from app.auth import router as auth_router
from app.config import Settings
from app.dashboard import router as dashboard_router
from app.health import router as health_router
from app.users import router as users_router


def create_app(settings: Settings | None = None) -> FastAPI:
    configuration = settings if settings is not None else Settings()
    app = FastAPI(
        title="CrediSure API",
        version="0.1.0",
        description="Backend for the CrediSure dashboard assessment.",
    )
    app.state.settings = configuration
    app.state.login_limiter = LoginLimiter()

    @app.middleware("http")
    async def prevent_caching(request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, error: HTTPException):
        codes = {
            401: "unauthorized",
            404: "not_found",
            422: "validation_error",
            429: "rate_limited",
            503: "unavailable",
        }
        return JSONResponse(
            {
                "error": {
                    "code": codes.get(error.status_code, "request_failed"),
                    "message": str(error.detail),
                }
            },
            status_code=error.status_code,
            headers=error.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        # Do not serialize validation inputs, which may include a password.
        fields = {
            ".".join(str(part) for part in item["loc"][1:]): item["msg"]
            for item in error.errors()
        }
        return JSONResponse(
            {
                "error": {
                    "code": "validation_error",
                    "message": "Please check your input.",
                    "field_errors": fields,
                }
            },
            status_code=422,
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, error: Exception):
        logging.getLogger(__name__).error("Unhandled API error", exc_info=error)
        return JSONResponse(
            {
                "error": {
                    "code": "internal_error",
                    "message": "Something went wrong. Please try again.",
                }
            },
            status_code=500,
            headers={"Cache-Control": "no-store"},
        )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            str(origin).rstrip("/") for origin in configuration.allowed_origins
        ],
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(dashboard_router)
    app.include_router(users_router)
    return app
