"""Application liveness endpoint."""

import sqlite3
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from app.database import connect

router = APIRouter(prefix="/api", tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@router.get("/health", response_model=HealthResponse)
def health(request: Request, response: Response) -> HealthResponse:
    """Check that the application database is initialized and readable."""
    try:
        with connect(request.app.state.settings.database_path) as database:
            for table in ("administrators", "sessions", "users"):
                database.execute(f"SELECT 1 FROM {table} LIMIT 1").fetchone()
    except sqlite3.Error:
        raise HTTPException(
            503, "Service is not ready. Initialize the database."
        ) from None
    response.headers["Cache-Control"] = "no-store"
    return HealthResponse()
