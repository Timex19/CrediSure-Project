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

Demo users have 80 distinct Nigerian full names and surnames, with matching synthetic email addresses. Re-running seed upgrades names/emails only for rows whose ID, full name and email still match the original generated demo records. It preserves custom or edited profiles, roles, statuses, joined dates, administrator credentials and sessions.

## Configuration

Process variables override `backend/.env`.

| Variable | Default / behavior |
| --- | --- |
| `CREDISURE_ALLOWED_ORIGINS` | JSON list of explicit HTTP(S) origins; empty list by default |
| `CREDISURE_DATABASE_PATH` | `backend/data/credisure.sqlite3`; relative paths resolve against backend/ |
| `CREDISURE_SESSION_MINUTES` | 30; permitted range 1–1440 |
| `CREDISURE_LOGIN_ATTEMPTS_PER_IP` | 10 admitted login requests per window; range 1–100 |
| `CREDISURE_LOGIN_ATTEMPTS_TOTAL` | 100 admitted login requests across all IPs per window; range 1–1000 |
| `CREDISURE_LOGIN_WINDOW_SECONDS` | Sliding window of 60 seconds; range 1–3600 |
| `CREDISURE_LOGIN_CONCURRENCY` | 2 in-flight login requests, including body reads and password checks; range 1–8 |
| `CREDISURE_LOGIN_BODY_BYTES` | 8192 actual body bytes, including streamed requests; range 1024–65536 |
| `CREDISURE_LOGIN_BODY_TIMEOUT_SECONDS` | 5 seconds to receive a complete login body; range 1–30 |
| `CREDISURE_ADMIN_EMAIL` | Required for seed, not runtime authentication |
| `CREDISURE_ADMIN_PASSWORD` | Required for seed; hashed with Argon2id |

Login verifies the stored database account. Changing credentials in `.env` does not replace an existing account automatically. After editing the configured email/password, explicitly apply them from this directory:

```powershell
.\.venv\Scripts\python.exe -m app.reset_admin
```

This local maintenance command requires exactly one existing administrator. It updates that account's email and password hash, keeps its ID and all directory data, and revokes its old sessions in one transaction. It requires a password of at least 12 characters and never prints the password or hash. Normal seeding continues to preserve existing credentials. No public password-reset endpoint is provided.

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

Sessions use cryptographically random tokens, store only SHA-256 token hashes, expire server-side and are deleted on logout. Passwords and bearer tokens must never be logged.

## Login abuse protection

Login admission runs before JSON parsing or database/password work. Defaults allow 10 requests per client IP and 100 total requests in a sliding 60-second window. Successful, invalid and malformed requests all count; changing an email address does not reset the source limit. The global cap bounds limiter memory and reduces IP-rotation abuse within one process. At most two admitted logins can read bodies or perform expensive password work at once. Excess requests receive a generic `429` with `Retry-After` and a retry message displayed by the existing login form. Retries do not extend an existing throttle window. There is no persistent account lockout that an unauthenticated attacker can trigger.

Login accepts uncompressed `application/json` only (`415` otherwise). Actual streamed bodies are limited to 8 KiB (`413`), independent of a claimed `Content-Length`. Body reads time out after five seconds (`408`). Capacity is released on disconnect, timeout or downstream error. Rejections retain allowed-origin CORS headers and `Cache-Control: no-store`; API responses also use `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.

These controls are process-local and reset on restart. Multiple workers/instances require an atomic shared limiter at the ingress or in a shared datastore. The global cap can temporarily delay legitimate logins during an attack; already authenticated requests are outside these login limits. Shared networks can hit the same IP limit. They do not prevent volumetric denial of service or replace MFA for an internet-facing administrator portal.

The application uses the ASGI client address and never parses `X-Forwarded-For` itself. Uvicorn may rewrite that address for proxies it trusts. For public hosting, configure trusted proxy IPs explicitly, prevent direct access around the ingress, and never trust forwarded headers from arbitrary clients. The local Vite proxy can group users under its own address. Enforce HTTPS, connection/body/header limits and timeouts at the ingress; configure CSP/frame protection on the host serving the frontend HTML. No public infrastructure was configured by this change.

Design reference: [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), including throttling, generic errors and the denial-of-service tradeoff of account lockouts.

## Checks

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m pip check
```

Tests use temporary databases and generated credentials. The pinned requirements include runtime and development dependencies. Starlette's current TestClient uses HTTPX2.

Official references: [settings](https://fastapi.tiangolo.com/advanced/settings/), [CORS](https://fastapi.tiangolo.com/tutorial/cors/), [testing](https://fastapi.tiangolo.com/tutorial/testing/), and [Argon2](https://argon2-cffi.readthedocs.io/en/stable/howto.html).
