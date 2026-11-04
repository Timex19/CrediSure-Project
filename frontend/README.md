# CrediSure Frontend

React/TypeScript with Vite, React Router, CSS Modules, Lucide icons and Oxlint. Use Node.js 22.12+ on the Node 22 release line or a newer supported LTS release.

## Setup

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Preserve existing environment configuration. The frontend requires the initialized backend for login and data. See the [root setup guide](../README.md).

| Variable                  | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `VITE_API_BASE_URL`       | Public API base; defaults to `/api`                             |
| `VITE_REQUEST_TIMEOUT_MS` | Request timeout; defaults to 10000 ms                           |
| `BACKEND_PROXY_TARGET`    | Vite development proxy destination; not exposed to browser code |

Production requires an API reverse proxy for `/api`, or an explicit `VITE_API_BASE_URL` with permitted backend CORS origins. The Vite development proxy is not part of the production build. Never place server credentials in `VITE_*` variables.

## Behavior

Login uses backend credential verification; tokens stay in memory. Refreshing signs out. Overview counts cover the full directory. User search/filter/page settings live in query parameters. Search is debounced 300 ms; status and page changes apply immediately. Superseded requests are canceled and their results ignored. All table updates hide previous results until the current response succeeds. Dates use UTC date-only parsing and the en-GB day/month/year display format.

## Checks

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

`npm run preview` previews the build; it requires a separately configured API origin or reverse proxy for data access.

For isolated browser integration checks:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Split-Path $PWD -Parent) '.playwright-browsers'
npx playwright install chromium
npm run test:e2e
```

Tests start a separate backend/frontend on configurable ports (defaults 8200/5274), generate credentials, and seed an isolated SQLite database. Artifacts live under ignored `test-results/`. Scenarios distinguish real API flows from simulated failure/unauthorized responses.
