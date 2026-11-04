"""Explicit, idempotent local assessment initialization: python -m app.seed."""

from datetime import date, timedelta

from argon2 import PasswordHasher

from app.config import Settings
from app.database import connect, initialize

FIRST_NAMES = (
    "Amara",
    "Daniel",
    "Chioma",
    "James",
    "Fatima",
    "Emmanuel",
    "Zara",
    "David",
    "Ada",
    "Samuel",
    "Aisha",
    "Michael",
    "Grace",
    "Tunde",
    "Nneka",
    "Ibrahim",
)
LAST_NAMES = ("Okafor", "Adeyemi", "Bello", "Eze", "Williams")


def seed(settings: Settings) -> None:
    if settings.admin_email is None or settings.admin_password is None:
        raise ValueError("Set CREDISURE_ADMIN_EMAIL and CREDISURE_ADMIN_PASSWORD first")
    password = settings.admin_password.get_secret_value()
    if len(password) < 12:
        raise ValueError(
            "The administrator password must contain at least 12 characters"
        )
    initialize(settings.database_path)
    with connect(settings.database_path) as database:
        email = str(settings.admin_email).lower()
        existing = database.execute(
            "SELECT id FROM administrators WHERE email = ?", (email,)
        ).fetchone()
        if existing is None:
            if database.execute("SELECT COUNT(*) FROM administrators").fetchone()[0]:
                raise ValueError(
                    "An administrator already exists; seeding will not replace it"
                )
            database.execute(
                "INSERT INTO administrators(email, password_hash) VALUES (?, ?)",
                (email, PasswordHasher().hash(password)),
            )
        for index in range(80):
            first = FIRST_NAMES[index % len(FIRST_NAMES)]
            last = LAST_NAMES[index // len(FIRST_NAMES)]
            database.execute(
                "INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?, ?, ?)",
                (
                    index + 1,
                    f"{first} {last}",
                    f"{first.lower()}.{last.lower()}@example.com",
                    "admin" if index % 9 == 0 else "member",
                    ("active", "active", "active", "pending", "inactive")[index % 5],
                    (date(2026, 1, 5) + timedelta(days=index * 3)).isoformat(),
                ),
            )


if __name__ == "__main__":
    try:
        seed(Settings())
    except ValueError as error:
        raise SystemExit(str(error)) from None
    print(
        "Database initialized. Synthetic users seeded; existing credentials preserved."
    )
