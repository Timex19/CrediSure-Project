# CrediSure Backend

FastAPI foundation for the assessment. Includes an application factory, validated environment settings, explicit CORS configuration, a typed health endpoint, and focused tests.

## Setup (PowerShell)

Use Python 3.13 (verified with 3.13.9). From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

Run the environment copy only on initial setup; preserve existing local configuration. Calling the virtual environment's Python directly avoids PowerShell activation-policy changes. Run commands from `backend/` so the `app` package can be imported.

- Health: <http://127.0.0.1:8000/api/health>
- Interactive API documentation: <http://127.0.0.1:8000/docs>
- OpenAPI schema: <http://127.0.0.1:8000/openapi.json>

`requirements.txt` pins the installed runtime and development dependencies, including transitive dependencies. It is the reproducible dependency snapshot for this foundation.

## Configuration

`app/config.py` loads `backend/.env`; process environment values take precedence.

| Variable | Format / behavior |
| --- | --- |
| `CREDISURE_ALLOWED_ORIGINS` | JSON array of explicit HTTP(S) origins. Defaults to an empty list, granting no cross-origin browser access. |

The example permits the usual Vite development origins. Update it locally when the frontend address or port changes. Wildcards, credentials, query strings, fragments and non-root paths are rejected. CORS governs browser access; it does not authenticate API requests.

## Checks

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m pip check
```

## Current scope

`GET /api/health` returns `{"status":"ok"}` with `Cache-Control: no-store`. It checks API liveness only. Database readiness and its failure response will be added with SQLite integration; there is no database in this scaffold.

Authentication, seeding, directory/summary endpoints, normalized application errors and frontend integration remain future work under the [implementation plan](../docs/IMPLEMENTATION_PLAN.md). No credentials or placeholder business endpoints are created. The frontend starter does not call the backend yet.

Official references: [settings](https://fastapi.tiangolo.com/advanced/settings/), [CORS](https://fastapi.tiangolo.com/tutorial/cors/), and [testing](https://fastapi.tiangolo.com/tutorial/testing/).
