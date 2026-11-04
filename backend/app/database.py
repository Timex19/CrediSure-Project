"""Small, explicit SQLite connection and schema utilities."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from fastapi import Request

SCHEMA = """
CREATE TABLE IF NOT EXISTS administrators (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    administrator_id INTEGER NOT NULL REFERENCES administrators(id),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')),
    joined_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS users_order ON users(joined_date DESC, id ASC);
CREATE INDEX IF NOT EXISTS users_status ON users(status);
"""


@contextmanager
def connect(path: Path) -> Iterator[sqlite3.Connection]:
    # mode=rw prevents a request from silently creating an uninitialized database.
    # FastAPI may resume one request's sync dependencies on different worker threads.
    # Connections remain request-scoped and are never shared across requests.
    connection = sqlite3.connect(
        f"{path.resolve().as_uri()}?mode=rw",
        uri=True,
        timeout=5,
        check_same_thread=False,
    )
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    try:
        connection.executescript(SCHEMA)
        connection.commit()
    finally:
        connection.close()


def get_database(request: Request) -> Iterator[sqlite3.Connection]:
    with connect(request.app.state.settings.database_path) as database:
        yield database
