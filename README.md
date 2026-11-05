# CrediSure Assessment

A read-only administrator dashboard built with React, TypeScript and Vite, backed by Python/FastAPI and SQLite.

## Features

- Backend-verified login, expiring sessions and logout revocation.
- Overview showing total, active, inactive and pending user counts.
- Paginated user directory with name/email search and account-status filters.
- Request progress, completion time, error feedback and retry.
- Responsive sidebar/mobile drawer with keyboard support.
- Synthetic, deterministic user data; no real customer data.
- Eighty distinct Nigerian demo names with unique surnames and matching synthetic email addresses.
- Bundled fictional portraits, a recent-user overview and an account-status distribution derived from API counts. See [asset notes and generation prompt](docs/ASSETS.md).

[PRD](docs/PRD.md) · [Implementation plan](docs/IMPLEMENTATION_PLAN.md) · [Verification evidence](docs/VALIDATION.md)

## Local setup

Requirements: Python 3.13 and Node.js 22.12+ on the Node 22 release line (or a newer supported LTS). Verified with Python 3.13.9 and Node 22.20.0. Run the services in separate terminals.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Copy environment examples only on first setup; preserve existing `.env` files. Set `CREDISURE_ADMIN_EMAIL` and a unique password of at least 12 characters in `backend/.env`, then:

```powershell
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

For this workspace, local credentials have already been generated in the ignored `backend/.env` file and 80 synthetic users seeded. Read that file locally to obtain your sign-in credentials. They are never bundled into the frontend. Re-running seed preserves existing credentials and does not duplicate users; changing `.env` after seeding does not reset the stored password.

If you change the administrator email/password in `.env`, apply them explicitly from `backend/` with `.\.venv\Scripts\python.exe -m app.reset_admin`. This replaces the single administrator's credentials, preserves directory data, and revokes existing sessions. See [backend setup](backend/README.md).

### Frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Open the address printed by Vite. The development proxy reads `BACKEND_PROXY_TARGET` from `frontend/.env`; adjust it if the backend port changes. Restart Vite after changing environment configuration. API docs are available at `http://127.0.0.1:8000/docs`.

The bearer session is saved in tab-scoped `sessionStorage` so page reloads preserve sign-in and the current route/filters. On reload, the app validates the saved session with `/api/auth/me` before rendering protected pages. The original 30-minute expiry remains unchanged; reload never extends it. Logout clears saved state and revokes the server session. No password or directory data is saved in browser storage. Temporary restoration failures offer Retry or Return to sign in.

## Checks

From `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m pip check
```

From `frontend/`:

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Browser tests start isolated servers and seed a separate test database; they do not touch the developer database or services:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Split-Path $PWD -Parent) '.playwright-browsers'
npx playwright install chromium
npm run test:e2e
```

Default test ports are 5274 and 8200. Configure `E2E_FRONTEND_PORT`, `E2E_BACKEND_PORT`, or `E2E_HOST` if needed. Test output and screenshots are ignored under `frontend/test-results/`.

## Structure and boundaries

- `frontend/src/app/`: protected shell and responsive navigation.
- `frontend/src/features/`: authentication, overview and user directory.
- `frontend/src/lib/`: typed API client and cancellation-safe request hook.
- `backend/app/`: configuration, database access, authentication and API routes.
- `backend/tests/` and `frontend/e2e/`: API and browser verification.

This is a local assessment application. User editing, registration, public password recovery, long-lived remembered sign-in and public deployment are outside scope. Public hosting requires HTTPS, an explicit frontend origin or reverse proxy, a persistent database volume, SPA route fallback, and a shared login limiter if using multiple workers. Login protection defaults to 10 requests per minute per client IP, 100 total per minute, two concurrent login requests, an 8 KiB body limit and a five-second body timeout within one process. Limits run before parsing and password verification. See [login protection and deployment boundaries](backend/README.md#login-abuse-protection). CORS is not authentication.

More details: [backend setup](backend/README.md) and [frontend setup](frontend/README.md).
