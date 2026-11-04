"""Protected, read-only user directory with server-side search and pagination."""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import Database, require_session

router = APIRouter(
    prefix="/api/users", tags=["users"], dependencies=[Depends(require_session)]
)
UserStatus = Literal["active", "inactive", "pending"]


class User(BaseModel):
    id: int
    full_name: str
    email: str
    role: Literal["admin", "member"]
    status: UserStatus
    joined_date: date


class UserPage(BaseModel):
    items: list[User]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("", response_model=UserPage)
def list_users(
    database: Database,
    search: Annotated[str, Query(max_length=100)] = "",
    status: UserStatus | None = None,
    page: Annotated[int, Query(ge=1, le=1_000_000)] = 1,
    page_size: Annotated[int, Query(ge=10, le=50)] = 10,
) -> UserPage:
    if page_size not in (10, 25, 50):
        raise HTTPException(422, "Page size must be 10, 25, or 50.")
    conditions = []
    parameters: list[str | int] = []
    if search.strip():
        # Escape LIKE metacharacters so input is always a literal substring.
        term = (
            search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        )
        conditions.append("(full_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')")
        parameters.extend([f"%{term}%", f"%{term}%"])
    if status:
        conditions.append("status = ?")
        parameters.append(status)
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    # One read transaction keeps metadata and page items on the same snapshot.
    database.execute("BEGIN")
    total = database.execute(
        "SELECT COUNT(*) FROM users" + where, parameters
    ).fetchone()[0]
    rows = database.execute(
        "SELECT id, full_name, email, role, status, joined_date FROM users"
        + where
        + " ORDER BY joined_date DESC, id ASC LIMIT ? OFFSET ?",
        [*parameters, page_size, (page - 1) * page_size],
    ).fetchall()
    return UserPage(
        items=[User(**dict(row)) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )
