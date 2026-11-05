# Implementation and verification evidence

Updated: 5 November 2026. Local Windows environment: Python 3.13.9, Node 22.20.0. Render backend and Firebase frontend deployments are recorded below; physical-device acceptance is not claimed.

## Delivered scope

All six assessment features are implemented: login, overview, user table, search/filter, API request feedback and responsive navigation. The backend uses SQLite locally, PostgreSQL on Render and 80 deterministic synthetic users. Credentials are supplied through ignored local configuration or Render secrets; no real credentials are present in committed examples or browser code.

## Automated checks executed

| Check | Result |
| --- | --- |
| Backend pytest suite | 41 passed with the real Render PostgreSQL contract test enabled |
| Backend Ruff lint | Passed |
| Backend Ruff format check | Passed |
| Backend pip dependency check | Passed |
| Frontend TypeScript check | Passed, including browser-test/config files |
| Frontend Oxlint | Passed |
| Frontend Prettier check | Passed |
| Frontend Vitest suite | 24 passed across 8 files after reload persistence |
| Frontend production build | Passed |
| Playwright Chromium suite | 9 passed after PostgreSQL support; local SQLite-backed servers, complete runner exit code 0 |
| Fresh frontend dependencies | `npm ci` and production build passed in `.verification/clean/frontend` |
| Fresh backend environment | Pinned dependency installation, seed, health, login, directory and pip check passed in `.verification/clean/backend` |

Fresh installation checks used a separate environment and database, preserving developer data. All `.verification/` contents are ignored. Browser tests also seed their own database and use separate services on ports 5274 and 8200 by default. Windows sandbox process restrictions prevented Playwright server teardown during the initial run; the completed suite ran with normal process permissions and shut down its servers successfully.

## Requirement traceability

| Requirement | Evidence |
| --- | --- |
| R1 Login | Backend correct/incorrect credentials, protected routes, hashed token storage, expiry and revocation; frontend validation, password visibility and submit state; real browser login/logout, protected deep link and refresh; simulated unauthorized response and failed logout |
| R2 Overview | Backend aggregation and zero-record tests; real browser counts 80/48/16/16; simulated all-zero overview; inspected desktop/mobile screenshots |
| R3 Table | Backend public fields, deterministic order, page boundaries and empty dataset; real browser pagination/page-size changes; simulated empty directory; inspected desktop/mobile table screenshots |
| R4 Search/filter | Backend case-insensitive search plus status, literal wildcards and invalid-query checks; unit debounce/page reset/page-size preservation and stale-response checks; real browser search, combined status, clear and back navigation |
| R5 Request status | Unit timeout, cancellation, retry and old-response guards; real browser successful completion; controlled browser slow response, failure/retry and unauthorized response |
| R6 Navigation | Browser viewport checks at 320, 375, 768, 1024 and 1440 px; no document horizontal overflow; mobile drawer focus wrap, Escape, focus restoration, overlay dismissal and route dismissal; landscape and CSS zoom/reduced-motion checks; not-found navigation |

Backend concurrent-request testing covers 18 protected requests across six test threads. This regression test was added after browser testing exposed SQLite's default thread affinity: a synchronous FastAPI dependency and its consuming handler can execute on different worker threads. Connections now permit that transition while remaining isolated per request.

## Visual review

Generated and inspected screenshots under ignored `frontend/test-results/`:

- `login-desktop.png`
- `overview-desktop.png`
- `overview-mobile.png`
- `users-desktop.png`
- `users-mobile.png`

Mobile pagination was adjusted after screenshot review so its previous/next buttons stay together. The table retains a labeled horizontal scroll region on narrow screens rather than hiding columns.

## Current developer services

Verified against the user's running backend on port 8000: login using the locally configured credentials, protected directory with 80 records, and logout. Verified `/api/health` forwarding through the running Vite services on ports 5173 and 5174. No additional developer server was left running by verification; existing user services were preserved.

## Boundaries and follow-up

### Green branding and login refinement

The supplied `credisure.webp` is used unchanged in the shared brand lockup and favicon. The primary theme now uses green (`#087747`), with matching sidebar, focus, and surface accents. The login has a forest-green illustration panel, clearer form hierarchy, larger form controls, and a compact mobile header. Its decorative workspace preview is labeled and hidden from assistive technology.

For this frontend update, the 9 frontend tests, production build, lint/type/format checks and all 6 Chromium browser scenarios passed. Browser checks additionally verified that the supplied logo loads, that login has no horizontal overflow at 320/375/768/1024/1440/1920 px, and that desktop login fits within a 936 px viewport height. Updated login desktop/mobile and overview screenshots were visually inspected. Backend code was unchanged, so the earlier 20-test backend result is historical evidence for this refinement rather than a rerun.

Calculated text contrast: white on the green primary is 5.61:1, muted text on white is 5.04:1, and primary text on white is 14.01:1. These spot checks are not a complete accessibility audit.

### Overview, directory and portrait refinement

The overview now displays four real recent directory records and an account-distribution chart calculated from the summary API. Counts link to matching status filters. Recent users have independent loading, failure/retry and empty states; the main request indicator is explicitly labeled as a summary request. The directory now has larger portraits, clearer typography, aligned controls, a working refresh action and a mobile horizontal-scroll hint. Backend endpoints and database schema are unchanged.

Verification for this update: 13 frontend tests passed, including portrait-failure fallback, recent-user retry independent of summary, correct account-share calculation and zero-user rendering. Seven Chromium scenarios passed, covering real portrait loading, metric-to-filter navigation, refresh, and intercepted portrait failure with usable initials and names. Existing search/filter/pagination/authentication/recovery/responsive checks continue to pass. Production build/type check, Oxlint and Prettier passed. Desktop/mobile overview and directory screenshots were visually inspected. The then-current 20 backend tests were not rerun because the backend was unchanged.

The generated demo portrait asset is bundled as a single 183,460-byte WebP, down from the 2,384,612-byte generation output, without changing dimensions or composition. Sixteen fictional portraits are reused for 80 synthetic profiles; they are not real-user photographs. See [asset notes and exact generation prompt](ASSETS.md). No external portrait network service or chart dependency was introduced.

### Distinct Nigerian demo names

Replaced the repeated first-name/surname cross product with 80 explicit fictional Nigerian full names. All 80 full names, surnames and generated email addresses are distinct. Stable IDs, roles, statuses, joined dates and portrait assignments remain unchanged.

The explicit seed command updates an existing row only when its ID, full name and email match the original demo fixture. It changes only the full name and corresponding synthetic email, preserving custom/edited profiles and non-name account data. Re-running it remains idempotent. The existing local database was backed up under ignored `.verification/`, updated, and checked to preserve all IDs, roles, statuses, dates, administrator records and session records.

Executed verification: 22 backend tests passed, including uniqueness and guarded legacy-upgrade coverage; seven browser scenarios passed with updated search results and profile names. Backend Ruff lint/format checks and frontend TypeScript, Oxlint and Prettier checks passed. Frontend component tests were not rerun for this data-only change; their earlier 13-test result remains historical evidence.

### Explicit administrator credential reset

Diagnosed a configured administrator email differing from the stored database email. Login correctly uses the database; configuration changes and normal seeding intentionally preserve the stored account. Added the local `python -m app.reset_admin` command to apply configured credentials to exactly one existing administrator, retain its ID, revoke its sessions and preserve all directory data atomically. Shared seed/reset validation enforces configured credentials and a minimum 12-character password. No credentials were added to source files or examples.

Executed verification: 24 backend tests passed, including reset login success, old credential/session rejection, stable administrator ID, preserved directory records, invalid-password rejection and missing-account refusal. Ruff lint/format checks passed. Applied the local configured credentials and verified sign-in, protected access to all 80 users, and logout through the running backend on port 8000. Frontend code and dependencies were unchanged; prior frontend test/build results were not rerun.

### Reload session persistence

The user requested sign-in to survive refresh. The original memory-only provider reset to unauthenticated on every reload. Sessions now persist in tab-scoped `sessionStorage` and are validated with `/auth/me` before protected content mounts. Restoration preserves the existing route and query, updates administrator metadata from the server, and retains the original expiry. Invalid/expired/revoked saved sessions are cleared. Temporary backend failures show a guarded retry/sign-out screen. Logout clears saved state before awaiting revocation. Browser storage restrictions retain memory-only login with an explanatory notice.

Executed verification: 24 frontend tests passed, including allowlisted persistence without password fields, validation before rendering, rejected/corrupt/expired sessions, retry, logout failure, StrictMode cancellation, expiry cleanup and blocked storage. Nine Chromium scenarios passed: overview and filtered/paginated directory reload without another login, unchanged expiry, logout followed by reload, expired saved state, real server revocation and temporary validation failure/retry. Type checking, production build, Oxlint and Prettier passed. No backend code or dependency changes were required. The pre-existing user edit in `backend/README.md` was left untouched.

### Login abuse protection

Moved login throttling from the validated endpoint into ASGI middleware so malformed requests also count before parsing or database/password work. Configurable defaults are 10 requests per IP and 100 globally per sliding minute, two in-flight logins, an 8 KiB actual streamed-body limit and a five-second body-read timeout. Unsupported media types and compressed bodies are rejected. Throttling returns `429`, `Retry-After` and an actionable message consumed by the existing login form. Limiter memory is bounded by the global cap. Slots are released on disconnect, timeout and downstream failure. Responses retain allowed-origin CORS and no-store headers; API responses add nosniff and no-referrer headers. No credentials, dependencies or database schema were changed.

Executed verification: 33 backend tests passed, including sliding-window expiry, bounded state under rotating addresses, spoofed forwarded headers, malformed/trailing-slash requests, invalid JSON, rejection CORS, oversized streamed bodies with misleading declared length, compressed bodies, concurrency rejection, downstream errors, slow reads and disconnect recovery. All nine real/browser-interception Chromium scenarios passed against isolated servers, covering login, reload persistence, filters, navigation, expiry/revocation and recovery. Ruff lint/format and dependency consistency checks passed. Frontend source was unchanged, so component tests/build/type checking were not rerun for this backend-only update.

These are application-level, process-local controls. They reset on restart and do not constitute a public deployment or penetration-test result. Shared limiting, trusted ingress/proxy configuration, HTTPS, connection/header limits and frontend-host security headers remain deployment work. MFA remains a recommended separate enhancement for an internet-facing administrator portal.

### Render backend deployment

Deployed the backend to Render Free in Frankfurt from commit `36dd46233f7889005532f8629b4d5a1f9bfdfcdc`, with a separate Render Free PostgreSQL database. The API is available at [credisure-api-gtfm.onrender.com](https://credisure-api-gtfm.onrender.com/api/health). The database expires on 5 December 2026. Automatic deploys are disabled, and existing unrelated workspace services were not changed.

Added a small database adapter using bound named parameters, PostgreSQL TLS with bounded connection/statement/lock waits, repeatable-read GET snapshots and serialized administrator maintenance. SQLite local development remains supported. Hosted startup refuses an ephemeral SQLite fallback, initializes durable storage and seeds demo profiles idempotently before starting one worker. The validated Render Blueprint describes the same resource choices; the actual resources were created through the official CLI, not managed by a Blueprint.

Verification: all 41 backend tests passed with the real PostgreSQL contract case enabled. That case uses a unique isolated schema, confirms the search path before seeding, and removes only its own schema. It exercised seeding/idempotence, protected API calls, counts, case-insensitive/literal search, pagination, logout and reset-driven revocation. Nine Chromium scenarios passed against isolated local SQLite-backed servers. Ruff lint/format and dependency checks passed. The initial mixed test run encountered Windows temporary-directory permissions; the complete passing run used a fresh workspace-local test directory.

Live HTTPS checks passed for readiness/no-store/nosniff headers, unauthenticated access rejection, generic credential errors, sign-in, counts `80/48/16/16`, combined search/status filtering, page two, logout and token rejection. A Render restart produced a confirmed fresh application startup; the pre-restart bearer session, administrator identity, 80-user dataset and configured credentials remained usable afterward. Logout then revoked the test sessions. External database access was temporarily restricted to the deployment computer for testing, then disabled entirely. Hosted administrator credentials are separate from local credentials and saved in the ignored `.verification/render/production.env` handoff file and Render's `.env` secret file. No local SQLite contents or existing sessions were uploaded.

Frontend source was unchanged during the backend deployment. Hosted browser/CORS integration was subsequently completed in the Firebase deployment below. This was an assessment deployment and functional verification, not a production security certification or load test.

### Firebase frontend deployment

Deployed the Vite production build to [credisure-a28d1.web.app](https://credisure-a28d1.web.app), with its alternate `firebaseapp.com` origin. Corrected the initialized `public` directory to `dist`, removed the generated welcome-page placeholder, retained SPA rewrites and added deployment security/cache headers. Public `.env.production` settings select the Render `/api` URL and a 90-second request timeout. No administrator credentials were placed in frontend configuration. The exact two production origins were added to Render CORS without replacing other environment variables or secrets, and the existing backend code was redeployed to apply them.

24 frontend tests, type checking, Oxlint, Prettier and the production build passed. An isolated Chromium browser exercised the actual hosted frontend and API: protected deep link, real login, summary counts, status filtering, pagination, reload preserving route/page/absolute expiry, search, mobile document overflow, logout and logged-out reload. No browser JavaScript or CSP errors were observed. A temporary verification selector initially used three dots rather than the input's ellipsis; correcting the selector allowed the complete check to pass without changing application code.

The initialized GitHub workflows now use Node 22, install/check/test/build from `frontend`, and deploy with `entryPoint: frontend`. The Firebase service-account repository secret was confirmed by name, without reading its value. Main deploys are serialized; preview deployments are limited to same-repository PRs, and authenticated preview use requires an explicitly permitted CORS origin. See [deployment details](FIREBASE_DEPLOYMENT.md).

GitHub Actions [run 42005127455](https://github.com/Timex19/CrediSure-Project/actions/runs/42005127455) completed successfully for commit `a8aa5cd`, including dependency installation, type checking, linting, all 24 frontend tests, production build and live Firebase deployment. SPA fallback, immutable hashed assets, security headers, both permitted CORS origins and rejection of an unlisted origin were also verified over HTTPS. PR preview deployment remains untested.

### Release limitations

- Browser integration was verified with automated Chromium on Windows. Safari, Firefox, physical phones, assistive technology and a formal WCAG audit were not performed.
- Request timeout is covered with controlled unit timers. Slow/failure/zero-data/unauthorized browser scenarios use explicit interception; they are distinct from the real API flow.
- Sign-in persistence is tab-scoped, requires available browser storage and keeps the original server expiry (30 minutes by default). Same-origin JavaScript can read session storage; this is not a long-lived remember-me feature.
- The directory is read-only. Account-status changes, registration, password reset and persistent sessions are outside scope.
- The frontend is hosted on Firebase and the backend on Render Free. The free database expires on 5 December 2026. Multi-process deployment needs shared limiting. The current limiter is process-local, and hosted startup disables forwarded-header trust, so ingress clients can share a throttle bucket. No load test or penetration test was performed.
- The production bundle needs `/api` reverse-proxied or `VITE_API_BASE_URL` set to the deployed API; the Vite development proxy is development-only.
