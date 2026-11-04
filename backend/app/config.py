"""Validated application configuration loaded from the environment."""

from pathlib import Path

from pydantic import AnyHttpUrl, EmailStr, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="CREDISURE_",
        extra="ignore",
    )

    allowed_origins: list[AnyHttpUrl] = Field(default_factory=list)
    database_path: Path = BACKEND_DIR / "data" / "credisure.sqlite3"
    admin_email: EmailStr | None = None
    admin_password: SecretStr | None = None
    session_minutes: int = Field(default=30, ge=1, le=1440)

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
