# Implementation and verification evidence

Date: 4 November 2026. Local Windows environment: Python 3.13.9, Node 22.20.0. This records executed checks; it does not claim public deployment or physical-device acceptance.

## Delivered scope

All six assessment features are implemented: login, overview, user table, search/filter, API request feedback and responsive navigation. The backend uses SQLite and 80 deterministic synthetic users. Administrator credentials were generated locally in the ignored `backend/.env`; no real credentials are present in committed examples or browser code.

## Automated checks executed

| Check | Result |
| --- | --- |
| Backend pytest suite | 20 passed |
| Backend Ruff lint | Passed |
| Backend Ruff format check | Passed |
| Backend pip dependency check | Passed |
| Frontend TypeScript check | Passed, including browser-test/config files |
| Frontend Oxlint | Passed |
| Frontend Prettier check | Passed |
| Frontend Vitest suite | 13 passed across 7 files after the overview/directory refinement |
| Frontend production build | Passed |
| Playwright Chromium suite | 7 passed after the overview/directory refinement; complete runner exit code 0 |
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

For this frontend update, the 9 frontend tests, production build, lint/type/format checks and all 6 Chromium browser scenarios passed. Browser checks additionally verified that the supplied logo loads, that login has no horizontal overflow at 320/375/768/1024/1440/1920 px, and that desktop login fits within a 936 px viewport height. Updated login desktop/mobile and overview screenshots were visually inspected. Backend code was unchanged, so the earlier 20-test backend result above is historical evidence for this refinement rather than a rerun.

Calculated text contrast: white on the green primary is 5.61:1, muted text on white is 5.04:1, and primary text on white is 14.01:1. These spot checks are not a complete accessibility audit.

### Overview, directory and portrait refinement

The overview now displays four real recent directory records and an account-distribution chart calculated from the summary API. Counts link to matching status filters. Recent users have independent loading, failure/retry and empty states; the main request indicator is explicitly labeled as a summary request. The directory now has larger portraits, clearer typography, aligned controls, a working refresh action and a mobile horizontal-scroll hint. Backend endpoints and database schema are unchanged.

Verification for this update: 13 frontend tests passed, including portrait-failure fallback, recent-user retry independent of summary, correct account-share calculation and zero-user rendering. Seven Chromium scenarios passed, covering real portrait loading, metric-to-filter navigation, refresh, and intercepted portrait failure with usable initials and names. Existing search/filter/pagination/authentication/recovery/responsive checks continue to pass. Production build/type check, Oxlint and Prettier passed. Desktop/mobile overview and directory screenshots were visually inspected. The 20 backend tests above were not rerun because the backend was unchanged.

The generated demo portrait asset is bundled as a single 183,460-byte WebP, down from the 2,384,612-byte generation output, without changing dimensions or composition. Sixteen fictional portraits are reused for 80 synthetic profiles; they are not real-user photographs. See [asset notes and exact generation prompt](ASSETS.md). No external portrait network service or chart dependency was introduced.

### Outstanding environments

- Browser integration was verified with automated Chromium on Windows. Safari, Firefox, physical phones, assistive technology and a formal WCAG audit were not performed.
- Request timeout is covered with controlled unit timers. Slow/failure/zero-data/unauthorized browser scenarios use explicit interception; they are distinct from the real API flow.
- The frontend token is intentionally memory-only; browser reload requires login. Expiry is 30 minutes by default and enforced by the server.
- The directory is read-only. Account-status changes, registration, password reset and persistent sessions are outside scope.
- No public hosting or production rollout was performed. Public deployment needs HTTPS, persistent storage, explicit API routing/CORS, SPA history fallback and a shared limiter for multiple processes. The current IP-based limiter is process-local and does not trust forwarded-IP headers.
- The production bundle needs `/api` reverse-proxied or `VITE_API_BASE_URL` set to the deployed API; the Vite development proxy is development-only.
