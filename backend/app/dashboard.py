"""Whole-directory metrics; table filters never affect these counts."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import Database, require_session

router = APIRouter(
    prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(require_session)]
)


class Summary(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    pending_users: int


@router.get("/summary", response_model=Summary)
def summary(database: Database) -> Summary:
    row = database.execute(
        "SELECT COUNT(*) total_users, "
        "COALESCE(SUM(status = 'active'), 0) active_users, "
        "COALESCE(SUM(status = 'inactive'), 0) inactive_users, "
        "COALESCE(SUM(status = 'pending'), 0) pending_users FROM users"
    ).fetchone()
    return Summary(**dict(row))
