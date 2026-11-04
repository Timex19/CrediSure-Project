"""Explicitly replace the single local administrator's configured credentials."""

import sqlite3

from argon2 import PasswordHasher

from app.config import Settings
from app.database import connect


def reset_admin(settings: Settings) -> None:
    email, password = settings.administrator_credentials()
    password_hash = PasswordHasher().hash(password)
    with connect(settings.database_path) as database:
        # Lock before inspecting the single-administrator assumption.
        database.execute("BEGIN IMMEDIATE")
        administrators = database.execute("SELECT id FROM administrators").fetchall()
        if len(administrators) != 1:
            raise ValueError(
                "Reset requires exactly one existing administrator. "
                "Initialize a new database with python -m app.seed."
            )
        administrator_id = administrators[0]["id"]
        database.execute(
            "UPDATE administrators SET email = ?, password_hash = ? WHERE id = ?",
            (email, password_hash, administrator_id),
        )
        database.execute(
            "DELETE FROM sessions WHERE administrator_id = ?", (administrator_id,)
        )


if __name__ == "__main__":
    try:
        reset_admin(Settings())
    except (ValueError, sqlite3.Error) as error:
        message = (
            str(error)
            if isinstance(error, ValueError)
            else "Could not reset the administrator. Check database setup and access."
        )
        raise SystemExit(message) from None
    print("Administrator credentials updated from configuration; old sessions revoked.")
