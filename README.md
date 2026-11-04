# CrediSure Assessment

A dashboard assessment using React with Vite and TypeScript, with a Python/FastAPI backend.

## Current status

The frontend is scaffolded from the official Vite `react-ts` template. The backend foundation provides a health endpoint, environment configuration and CORS. Assessment features and frontend/backend integration have not been implemented.

- [Product requirements](docs/PRD.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Frontend setup](frontend/README.md)
- [Backend setup](backend/README.md)

## Run the frontend

Use Node.js 22.12+ on the Node 22 release line, or a newer supported LTS release. Setup was verified with Node 22.20.0 and npm 11.16.0.

```powershell
cd frontend
npm ci
npm run dev
```

Open the local address printed by Vite. To verify the scaffold:

```powershell
npm run typecheck
npm run lint
npm run build
```

The current official template includes Oxlint. It is retained instead of adding the ESLint configuration originally proposed in the plan. No backend or environment variables are required for the starter screen.

## Run the backend

Use Python 3.13. From the repository root, follow these initial setup commands:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --reload --host 127.0.0.1 --port 8000
```

Preserve an existing `.env` when restarting. Health is available at `http://127.0.0.1:8000/api/health` and interactive API docs at `http://127.0.0.1:8000/docs`. See the backend README for configuration, checks and current scope.
