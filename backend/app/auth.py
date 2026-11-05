"""Password verification and revocable, expiring opaque sessions."""

import hashlib
import secrets
import sqlite3
import time
from datetime import UTC, datetime
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from app.database import get_database

router = APIRouter(prefix="/api/auth", tags=["authentication"])
password_hasher = PasswordHasher()
# Verify unknown accounts against an actual Argon2 hash to avoid a fast-failure path.
dummy_hash = password_hasher.hash(secrets.token_urlsafe(32))
bearer = HTTPBearer(auto_error=False)
Database = Annotated[sqlite3.Connection, Depends(get_database)]


class Administrator(BaseModel):
    id: int
    email: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    administrator: Administrator


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def require_session(
    database: Database,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> sqlite3.Row:
    row = None
    if credentials and len(credentials.credentials) <= 256:
        row = database.execute(
            "SELECT a.id, a.email, s.token_hash FROM sessions s "
            "JOIN administrators a ON a.id = s.administrator_id "
            "WHERE s.token_hash = ? AND s.expires_at > ?",
            (token_hash(credentials.credentials), int(time.time())),
        ).fetchone()
    if row is None:
        raise HTTPException(
            401,
            "Your session has ended. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return row


Session = Annotated[sqlite3.Row, Depends(require_session)]


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, database: Database) -> LoginResponse:
    administrator = database.execute(
        "SELECT * FROM administrators WHERE email = ?", (str(payload.email).lower(),)
    ).fetchone()
    try:
        password_hasher.verify(
            administrator["password_hash"] if administrator else dummy_hash,
            payload.password,
        )
    except VerificationError:
        raise HTTPException(401, "Email or password is incorrect.") from None
    if administrator is None:
        raise HTTPException(401, "Email or password is incorrect.")
    if password_hasher.check_needs_rehash(administrator["password_hash"]):
        database.execute(
            "UPDATE administrators SET password_hash = ? WHERE id = ?",
            (password_hasher.hash(payload.password), administrator["id"]),
        )
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    expires = now + request.app.state.settings.session_minutes * 60
    database.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
    database.execute(
        "INSERT INTO sessions VALUES (?, ?, ?, ?)",
        (token_hash(token), administrator["id"], now, expires),
    )
    return LoginResponse(
        access_token=token,
        expires_at=datetime.fromtimestamp(expires, UTC),
        administrator=Administrator(
            id=administrator["id"], email=administrator["email"]
        ),
    )


@router.get("/me", response_model=Administrator)
def me(session: Session) -> Administrator:
    return Administrator(id=session["id"], email=session["email"])


@router.post("/logout", status_code=204)
def logout(session: Session, database: Database) -> Response:
    database.execute(
        "DELETE FROM sessions WHERE token_hash = ?", (session["token_hash"],)
    )
    return Response(status_code=204)
