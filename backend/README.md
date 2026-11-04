# CrediSure Backend

FastAPI with SQLite, Argon2id password hashing and revocable opaque bearer sessions. Use Python 3.13 and run commands from this directory.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Preserve an existing `.env`. Set administrator email/password locally (minimum 12 password characters), then initialize and run:

```powershell
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

Seeding creates the schema and 80 synthetic users, preserves existing credentials, and refuses to add a second administrator with a different email. It never resets data on server startup. Local workspace credentials have already been generated in the ignored `.env`; no credentials are committed.

## Configuration

Process variables override `backend/.env`.

| Variable | Default / behavior |
| --- | --- |
| `CREDISURE_ALLOWED_ORIGINS` | JSON list of explicit HTTP(S) origins; empty list by default |
| `CREDISURE_DATABASE_PATH` | `backend/data/credisure.sqlite3`; relative paths resolve against backend/ |
| `CREDISURE_SESSION_MINUTES` | 30; permitted range 1–1440 |
| `CREDISURE_ADMIN_EMAIL` | Required for seed, not runtime authentication |
| `CREDISURE_ADMIN_PASSWORD` | Required for seed; hashed with Argon2id |

Changing seed credentials in `.env` does not reset a password already in the database. There is no password-reset feature in this assessment.

## Endpoints

| Method/path | Behavior |
| --- | --- |
| `GET /api/health` | Database schema readiness; 200 or 503 |
| `POST /api/auth/login` | JSON email/password; opaque session and administrator |
| `GET /api/auth/me` | Current administrator; requires bearer session |
| `POST /api/auth/logout` | Revoke current session; requires bearer session |
| `GET /api/dashboard/summary` | Whole-directory status counts; requires bearer session |
| `GET /api/users` | Read-only search/filter/pagination; requires bearer session |

API docs: `http://127.0.0.1:8000/docs`. Directory parameters: `search` (max 100), `status` (active/inactive/pending), `page` (1–1,000,000), `page_size` (10/25/50). Name/email search is case-insensitive for the synthetic ASCII dataset and treats LIKE metacharacters literally. Rows sort by joined date descending then ID ascending. Error responses use `{error: {code, message, field_errors?}}` without echoed request bodies. API responses use `Cache-Control: no-store`.

Sessions use cryptographically random tokens, store only SHA-256 token hashes, expire server-side and are deleted on logout. Passwords and bearer tokens must never be logged. Login has a per-process client-IP throttle; multi-worker public hosting needs a shared limiter.

## Checks

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m pip check
```

Tests use temporary databases and generated credentials. The pinned requirements include runtime and development dependencies. Starlette's current TestClient uses HTTPX2.

Official references: [settings](https://fastapi.tiangolo.com/advanced/settings/), [CORS](https://fastapi.tiangolo.com/tutorial/cors/), [testing](https://fastapi.tiangolo.com/tutorial/testing/), and [Argon2](https://argon2-cffi.readthedocs.io/en/stable/howto.html).
