# CrediSure Assessment — Implementation Plan

Version: 0.1 | Date: 4 November 2026 | Status: Implementation authorized and in progress; evidence tracked in VALIDATION.md

Companion specification: [PRD](PRD.md). Requirement IDs refer to that document.

## 1. Current state and implementation boundary

At planning time, the workspace contained no application files and was not a Git repository. The user subsequently authorized both scaffolds and implementation. React/Vite and FastAPI now exist under `frontend/` and `backend/`; current verification evidence is recorded separately in `VALIDATION.md`.

The PRD and this plan preceded implementation as requested. Unspecified assessment details remain proposed decisions rather than assessor mandates. The current Vite template's Oxlint is retained in place of the originally proposed ESLint. The installed Starlette TestClient uses HTTPX2, superseding the older HTTPX test dependency proposed below.

## 2. Proposed architecture

```text
React + TypeScript (Vite)
  Routes: Login / Overview / Users / Not found
  Auth context: administrator and in-memory bearer token
  Feature components: forms, summary cards, directory controls/table
  Shared API client: auth header, timeout, normalized errors
       |
       | JSON HTTP through configurable API origin
       v
FastAPI
  Routes + Pydantic validation
  Authentication dependency + session verification
  Database queries for directory/counts and session records
       |
       v
SQLite: administrators, sessions, directory users
```

Use one repository with `frontend/`, `backend/`, and `docs/`. No microservices, external auth service, generic repository framework, or global state library. Keep files small and split them when responsibilities justify it.

### Stack decisions

| Concern | Proposed choice | Reason |
| --- | --- | --- |
| Frontend | Vite React TypeScript template | User-selected toolchain with static typing |
| Routing | React Router | Separate routes, route guards, query parameters and browser history |
| Styling | CSS variables and CSS Modules | Small dependency surface; reusable visual tokens |
| Forms | Native form semantics and React state | Two-field login and simple directory controls do not require a form library |
| Data fetching | Fetch API with a shared client and focused hooks | Explicit cancellation, request state, timeout and retry without a separate cache layer |
| Icons | One small consistent SVG icon set if needed | Accessible menu, password and navigation controls |
| Backend | FastAPI, Pydantic, Uvicorn | Typed validation and API documentation |
| Storage | SQLite through Python `sqlite3` | Sufficient for a small local assessment; parameterized SQL without an ORM |
| Authentication | `secrets`-generated opaque sessions, hashed with SHA-256 in storage; Argon2id password hashing via a maintained library | Server-enforced expiry/revocation without JWT key management |
| Frontend checks | ESLint, TypeScript, Vitest, React Testing Library | Static checks and focused behavior tests |
| Backend checks | pytest, HTTPX/TestClient, Ruff | Endpoint tests and lint/format verification |
| Browser flows | Playwright | Login, navigation, filtering, recovery, and viewport evidence |

Use compatible stable releases selected at setup, record runtime requirements, and commit dependency lockfiles. Do not guess exact future package APIs from this document. Check official documentation for the selected versions during implementation. Keep database operations in synchronous FastAPI handlers/dependencies or explicitly offload them; do not block the event loop with synchronous SQLite calls inside async handlers. Use short-lived per-request connections and transactions for writes.

### Proposed structure

```text
docs/
  PRD.md
  IMPLEMENTATION_PLAN.md
frontend/
  src/
    app/                 # Router, providers, application shell
    features/
      auth/              # Login, auth context, route guard
      overview/          # Summary page and API hook
      users/             # Table, controls, pagination, API hook
    components/          # Only genuinely shared UI
    lib/                 # API client and shared public types
    styles/              # Reset and design tokens
  e2e/
  .env.example
backend/
  app/
    main.py              # App factory, middleware, handlers
    config.py            # Environment validation
    database.py          # Connection/schema setup and SQL helpers
    auth.py              # Auth routes, schemas, session dependency
    users.py             # Directory routes, schemas, queries
    dashboard.py         # Summary route/query
    health.py            # Health check
  scripts/               # Explicit schema/seed commands
  tests/
  .env.example
README.md
.gitignore
```

Adapt names to actual code as it develops; do not create empty abstraction folders to match the diagram.

## 3. Delivery phases

### Phase 0 — Review scope and contracts (current phase)

1. Review the six-requirement acceptance matrix and proposed data fields, summary metrics, and status values.
2. Confirm the deliberate in-memory session behavior: page reload signs out; route navigation does not.
3. Incorporate any assessor-provided design, API, deadline, or submission instructions.
4. Agree the visual direction and implementation scope before writing application code.

Exit: review accepted or revisions documented. No code implementation before this exit.

### Phase 1 — Project foundation

1. Initialize Git and appropriate ignores if still absent; preserve existing user files.
2. Verify installed Node/Python runtimes against selected package requirements.
3. Scaffold Vite React TypeScript in `frontend/`; set up a backend virtual environment and reproducible dependency files.
4. Configure lint, formatting, type checks, tests, environment examples and documented development commands.
5. Add FastAPI application factory, validated configuration, database initialization command, and health endpoint.
6. Define global styles, tokens, router and a minimal page shell.

Exit: frontend starter builds; backend starts and health works; configuration errors are actionable; no committed secrets. Commit theme: project foundation.

### Phase 2 — Data and backend contract (R1–R4)

1. Create administrators, sessions and directory-user tables with constraints for enum values and unique normalized emails.
2. Add an explicit, idempotent seed command for synthetic users and environment-provisioned administrator credentials. Re-running must not duplicate users or silently reset administrator passwords.
3. Implement login, session lookup, `/auth/me`, expiry, and logout revocation. Store token hashes only. Validate authorization on every protected route.
4. Implement summary aggregation and parameterized literal name/email search with status filtering, deterministic ordering, bounded pagination and matching count queries.
5. Normalize errors including validation, set no-store headers, and configure explicit CORS origins.
6. Test endpoints against a temporary database with controlled records; isolate test configuration from developer data.

Exit: API matches the PRD contract; auth, filtering, aggregation, pagination and error tests pass. Commit theme: backend API.

### Phase 3 — Login and responsive shell (R1, R6)

1. Build the shared API client with configured base URL, JSON parsing, authorization, timeout and cancellation support.
2. Implement auth context and protected routes. Centralize `401` handling and clear all protected state on session loss; canceled requests from a previous session cannot repopulate it.
3. Build login validation, password visibility, submit progress and actionable errors.
4. Build sidebar, mobile drawer, page headings, active route states and logout handling.
5. Verify keyboard focus, Escape/overlay dismissal, route changes and not-found navigation.

Exit: valid/invalid login and logout work against FastAPI; protected routes and drawer behavior pass focused tests. Commit theme: authentication and navigation.

### Phase 4 — Overview and directory (R2–R4)

1. Implement overview summary requests, cards, placeholders, zero counts and retry.
2. Implement the semantic directory table, status badges, dates and pagination.
3. Bind search/status/page/page-size to query parameters; use safe parsing defaults and browser history behavior.
4. Add 300 ms search debounce, page reset rules, combined server queries and Clear filters.
5. Abort superseded requests and guard response identity. Ignore cancellations and prevent older requests from changing data or status.
6. Implement separate empty-directory, no-matches, loading and failure views.

Exit: results and counts agree with backend responses; query/history/page behavior and stale-response tests pass. Commit theme: overview and user directory.

### Phase 5 — Status feedback and visual refinement (R5, R6)

1. Reuse a small status component driven by each page's actual request state; do not issue health polling to infer request success.
2. Handle Not loaded, Updating, Loading, Updated with timestamp, and Failed with Retry. Verify retries retain current parameters.
3. Validate network timeouts, backend failure, invalid sessions, canceled requests and logout failure behavior.
4. Refine spacing, type hierarchy, control alignment, table density and drawer transitions.
5. Check mobile/tablet/desktop reflow, keyboard navigation, contrast, live announcements and reduced motion.

Exit: every required state is reachable and understandable; visual checks at agreed widths show no page overflow. Commit theme: feedback and responsive polish.

### Phase 6 — Final verification and submission

1. Run frontend type/lint/format checks, component tests and production build; backend lint/format checks and API tests.
2. Run browser flows against the real backend, including login, summary, combined filtering, pagination, logout and unauthorized direct navigation.
3. Use controlled browser interception only for slow/failing-request scenarios; identify those checks as simulated failures rather than real backend integration evidence.
4. Manually inspect target widths, keyboard-only use, focus behavior and status messaging. Record what was actually checked.
5. Verify setup from clean dependency/database state in a separate temporary workspace without deleting developer data.
6. Write README setup, environment reference, schema/seed steps, commands, architecture, session behavior, screenshots if useful, and known limitations. Include a requirement-to-evidence checklist.
7. Review changes for credentials, dead controls, unhandled errors and unrelated files.
8. If a hosted demo is required, separately select hosting, persistent storage, HTTPS, allowed origins, SPA route fallback and login throttling; verify the deployed frontend/backend together.

Exit: every PRD acceptance criterion has recorded evidence or an explicitly disclosed unresolved gap. Commit theme: verification and handoff. Do not report deployment or tests as completed unless executed.

## 4. Test strategy

| Layer | High-value scenarios |
| --- | --- |
| Backend auth | Correct/wrong/missing credentials; no account enumeration; missing/malformed/expired/revoked bearer; logout prevents reuse; sensitive fields excluded |
| Backend data | Accurate status totals and zero dataset; case-insensitive name/email; literal `%`/`_`; combined filter; stable ordering and page boundaries; count uses same filters; invalid inputs return normalized `422` |
| Frontend behavior | Validation and duplicate-submit prevention; safe `401` handling; search debounce; reset page; URL state; old responses ignored; retry, timeout and logout failure |
| Browser integration | Real login → overview → users → search/status → pagination → logout; protected deep links; back/forward; not-found route; keyboard drawer |
| Responsive/accessibility | 320/375/768/1024/1440 px; local table scroll; no document overflow; labels, focus, contrast and reduced motion |

Use controllable promises/fake timers for debounce and request-order tests. Test behavior rather than implementation details. Use generated session values and isolated databases in tests; never depend on a developer's configured password or persistent database.

## 5. Configuration and delivery notes

Planned backend settings: database path, administrator seed email/password, allowed origins, session lifetime and environment mode. Planned frontend settings: public API base URL and request timeout. Validate settings at startup. Supply exact names and defaults in implementation, and keep placeholders in examples.

Secrets belong only in backend configuration. URLs and environment-specific addresses belong in configuration. Seed records must use clearly synthetic identities. Production hosting is a separate conditional release concern; SQLite is selected for the local assessment and does not imply horizontally scalable shared storage.

## 6. Risks and decisions to revisit

| Risk / uncertainty | Handling |
| --- | --- |
| Brief omits API/design/rubric details | Keep defaults explicit; incorporate supplied material before coding |
| Extra features consume assessment time | Complete the six required flows before considering enhancements |
| Reload signs out | Document and review the intentional memory-only session; add persistence only if required |
| Stale responses misrepresent search or API status | Cancellation plus response-identity checks and focused race tests |
| Database growth/concurrent deployment | Keep local assessment scope; reassess storage/indexing if scale is requested |
| Public demo exposes credential endpoint | Require throttling, HTTPS, secure configuration and safe demo credentials before public release |
| Automated tests miss visual/focus issues | Perform and record browser and keyboard inspection |

No calendar estimate is committed because the assessment deadline and availability are unknown. Implement in the dependency order above; track completion against exit criteria.

## 7. Official technical references

References consulted for planning; re-check selected versions during setup:

- [Vite getting started](https://vite.dev/guide/) — supported templates and runtime requirements.
- [React: build an app from scratch](https://react.dev/learn/build-a-react-app-from-scratch) — client application tooling and architecture considerations.
- [FastAPI security](https://fastapi.tiangolo.com/tutorial/security/) — authentication primitives. Opaque session storage/revocation is our proposed application design, not a claim that FastAPI provides it automatically.
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/) — explicit frontend origins and middleware configuration.
