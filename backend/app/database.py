"""Request-scoped SQLite/local and PostgreSQL/hosted database connections."""

import re
import sqlite3
from collections.abc import Iterator, Mapping, Sequence
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import psycopg
from fastapi import Request
from psycopg.conninfo import conninfo_to_dict
from psycopg.rows import dict_row

from app.config import Settings

DATABASE_ERRORS = (sqlite3.Error, psycopg.Error)
Row = sqlite3.Row | dict[str, Any]

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


class DatabaseConnection:
    """Keep application SQL parameterized across both DB-API drivers."""

    def __init__(self, connection: sqlite3.Connection | psycopg.Connection) -> None:
        self.connection = connection
        self.postgres = isinstance(connection, psycopg.Connection)

    def execute(
        self,
        query: str,
        parameters: Mapping[str, Any] | Sequence[Any] = (),
    ) -> sqlite3.Cursor | psycopg.Cursor:
        if self.postgres and parameters:
            if not isinstance(parameters, Mapping):
                raise TypeError(
                    "PostgreSQL application queries require named parameters"
                )
            # Only trusted application SQL uses :name markers. Values are always
            # bound by the driver, never interpolated into the query string.
            query = re.sub(r"(?<!:):([a-z_][a-z_0-9]*)", r"%(\1)s", query)
        return (
            self.connection.execute(query, parameters or None)
            if self.postgres
            else self.connection.execute(query, parameters)
        )

    def begin_read(self) -> None:
        if not self.postgres:
            self.connection.execute("BEGIN")
        # PostgreSQL connections already use a repeatable-read transaction,
        # including when authentication performed the first SELECT.

    def lock_administrators(self) -> None:
        self.connection.execute(
            "LOCK TABLE administrators IN EXCLUSIVE MODE"
            if self.postgres
            else "BEGIN IMMEDIATE"
        )


@contextmanager
def connect(
    target: Path | Settings, *, snapshot: bool = False
) -> Iterator[DatabaseConnection]:
    if isinstance(target, Settings) and target.database_url is not None:
        url = target.database_url.get_secret_value()
        connection_options = conninfo_to_dict(url)
        sslmode = connection_options.get("sslmode", "require")
        if sslmode not in ("require", "verify-ca", "verify-full"):
            raise ValueError("PostgreSQL connections must require TLS")
        with psycopg.connect(
            url,
            sslmode=sslmode,
            row_factory=dict_row,
            connect_timeout=5,
            options=(
                connection_options.get("options", "")
                + " -c statement_timeout=5000 -c lock_timeout=5000"
            ).strip(),
        ) as connection:
            connection.isolation_level = (
                psycopg.IsolationLevel.REPEATABLE_READ
                if snapshot
                else psycopg.IsolationLevel.READ_COMMITTED
            )
            yield DatabaseConnection(connection)
        return
    path = target.database_path if isinstance(target, Settings) else target
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
            yield DatabaseConnection(connection)
    finally:
        connection.close()


def initialize(target: Path | Settings) -> None:
    if isinstance(target, Settings) and target.database_url is not None:
        with connect(target) as database:
            database.execute(SCHEMA)
        return
    path = target.database_path if isinstance(target, Settings) else target
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    try:
        connection.executescript(SCHEMA)
        connection.commit()
    finally:
        connection.close()


def get_database(request: Request) -> Iterator[DatabaseConnection]:
    with connect(
        request.app.state.settings, snapshot=request.method == "GET"
    ) as database:
        yield database
