"""Validated application configuration loaded from the environment."""

from pathlib import Path
from urllib.parse import urlsplit

from pydantic import AnyHttpUrl, EmailStr, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="CREDISURE_",
        env_ignore_empty=True,
        extra="ignore",
    )

    allowed_origins: list[AnyHttpUrl] = Field(default_factory=list)
    database_path: Path = BACKEND_DIR / "data" / "credisure.sqlite3"
    database_url: SecretStr | None = None
    admin_email: EmailStr | None = None
    admin_password: SecretStr | None = None
    session_minutes: int = Field(default=30, ge=1, le=1440)
    login_attempts_per_ip: int = Field(default=10, ge=1, le=100)
    login_attempts_total: int = Field(default=100, ge=1, le=1000)
    login_window_seconds: int = Field(default=60, ge=1, le=3600)
    login_concurrency: int = Field(default=2, ge=1, le=8)
    login_body_bytes: int = Field(default=8192, ge=1024, le=65536)
    login_body_timeout_seconds: int = Field(default=5, ge=1, le=30)

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None:
            parsed = urlsplit(value.get_secret_value())
            if parsed.scheme not in ("postgres", "postgresql") or not parsed.hostname:
                raise ValueError("Database URL must be a PostgreSQL connection URL")
        return value

    def administrator_credentials(self) -> tuple[str, str]:
        """Read validated credentials for explicit seed/reset commands only."""
        if self.admin_email is None or self.admin_password is None:
            raise ValueError(
                "Set CREDISURE_ADMIN_EMAIL and CREDISURE_ADMIN_PASSWORD first"
            )
        password = self.admin_password.get_secret_value()
        if len(password) < 12:
            raise ValueError(
                "The administrator password must contain at least 12 characters"
            )
        return str(self.admin_email).lower(), password

    @field_validator("database_path")
    @classmethod
    def resolve_database_path(cls, value: Path) -> Path:
        return value if value.is_absolute() else BACKEND_DIR / value

    @field_validator("allowed_origins")
    @classmethod
    def validate_origins(cls, origins: list[AnyHttpUrl]) -> list[AnyHttpUrl]:
        for origin in origins:
            if (
                origin.path not in (None, "/")
                or origin.query is not None
                or origin.fragment is not None
                or origin.username is not None
                or origin.password is not None
                or origin.host is None
                or "*" in origin.host
            ):
                raise ValueError("Allowed origins must be explicit HTTP(S) origins")
        return origins
