# CrediSure Assessment — Product Requirements Document

Version: 0.1 | Date: 4 November 2026 | Status: Implementation authorized in chat; verification tracked in VALIDATION.md

## 1. Purpose

Build a simple, polished dashboard that demonstrates frontend engineering, backend integration, responsive design, and reliable interaction states. An evaluator must be able to sign in, understand the user population, browse users, search and filter results, and see whether API requests are loading, succeeding, or failing.

The supplied assessment is the source of truth. This document translates its six requirements into testable behavior. Proposed details below are scope decisions for this assessment, not additional requirements supplied by the assessor.

## 2. Confirmed requirements

| ID | Assessment requirement | Planned experience |
| --- | --- | --- |
| R1 | Login screen | Validated sign-in form connected to backend authentication |
| R2 | Dashboard overview | Summary cards calculated from backend user data |
| R3 | User table | Read-only, paginated user directory |
| R4 | Search and filter functionality | Name/email search combined with status filtering |
| R5 | API request status indicator | Visible loading, success, and failure feedback with recovery |
| R6 | Responsive navigation | Desktop sidebar and accessible mobile navigation drawer |

Confirmed technology choices: React with Vite for the frontend; Python with FastAPI for the backend.

## 3. Proposed assumptions and boundaries

- Audience: one assessment evaluator acting as an administrator; no organization or tenant model.
- Data: deterministic synthetic users stored in a local SQLite database. No real customer or financial data.
- Authentication: one administrator provisioned through environment configuration; real backend credential verification, not a frontend-only login switch.
- Directory: read-only. User creation, editing, deletion, invitations, and bulk actions are excluded.
- Search: case-insensitive literal substring matching over full name and email. Status options: All, Active, Inactive, Pending.
- Overview: total users, active users, inactive users, and pending users. Counts cover the full directory and do not change with table filters.
- Navigation: Overview and Users are the only authenticated destinations. No decorative links to unfinished screens.
- Delivery: locally runnable project and clear setup instructions. Public hosting is optional unless the assessor requires a live URL.
- Session: short-lived bearer session held in browser memory. A browser reload requires signing in again; navigation within the app preserves the session. Persistent sign-in is outside the initial scope.
- The initial brief supplied no brand assets, wireframes, deadline, external API, deployment target, or evaluation rubric. The user subsequently supplied `credisure.webp` and requested a green primary theme; use the supplied logo unchanged and retain the name “CrediSure Dashboard”.

## 4. Goals and success criteria

1. All six requirements work end to end against FastAPI.
2. An evaluator can complete login → overview → users → search/filter → logout without assistance beyond the README.
3. Empty datasets, no matching results, slow responses, invalid sessions, and failed requests produce useful interfaces.
4. The interface works at mobile, tablet, and desktop widths with keyboard navigation.
5. A fresh checkout can be configured, seeded, started, and tested using documented commands.

Non-goals: lending workflows, credit scores, payments, analytics charts without a defined metric, multiple permission levels, registration, password reset, social login, refresh tokens, real-time updates, and a production operations platform.

## 5. Users and journeys

**Evaluator / administrator:** opens the application, signs in using locally configured assessment credentials, reviews summary cards, opens the directory, finds a user by name or email, narrows results by status, clears filters, changes page, and signs out.

**Recovery journey:** a directory request fails; the interface describes the failure and offers Retry. A successful retry restores results and updates the request indicator. An expired session returns the user to login with a clear explanation.

## 6. Functional requirements and acceptance criteria

### R1 — Login and session handling

- `/login` provides visible email/password labels, a password visibility toggle, and a primary sign-in action. Enter submits the form.
- Missing fields and malformed email produce field-level feedback before submission. Password contents are never trimmed or logged.
- Submission disables duplicate attempts and shows progress. Incorrect credentials receive a generic message that does not disclose account existence.
- Successful login opens `/overview`. Direct unauthenticated visits to `/overview` or `/users` return to `/login`; backend endpoints independently enforce authentication.
- Expired, invalid, or revoked sessions cause a clear sign-in prompt and removal of protected client data.
- Logout revokes the server session, clears local state and cached protected data, and returns to login. If the request fails, local sign-out still completes and the user is told server revocation could not be confirmed.
- Back navigation after logout cannot display previously cached directory data.

### R2 — Dashboard overview

- `/overview` shows Total, Active, Inactive, and Pending cards populated by the summary API.
- Each card has an unambiguous label and a nonnegative integer. Total equals Active + Inactive + Pending.
- A successful empty dataset displays zero counts. Loading placeholders and a failure message with Retry are distinct states.
- Provide a clear action to open the user directory. Do not display invented trends, revenue, or percentage growth.
- Show the four most recently joined users from the directory API, with independent loading/error/empty handling. Account distribution uses the summary status counts; the active share is active divided by total, with an explicit zero-user state. Summary cards and distribution links open the corresponding directory filter.

### R3 — User directory

- `/users` shows Full name, Email, Role, Status, and Joined date. IDs provide stable row keys and need not be displayed.
- Status uses text plus a visual badge; color is supplementary. Dates are date-only values displayed consistently with a documented format.
- The server returns paginated results: default 10 rows; supported page sizes 10, 25, and 50. Display result count, page information, Previous, and Next.
- Sorting is fixed and deterministic: newest joined date first, then ascending ID. User-controlled sorting is outside scope.
- Pagination controls prevent moving beyond the available pages. An empty result shows no misleading “page 1 of 0” text.
- An empty directory explains that no users exist. A filtered empty result says no users match and offers Clear filters.
- On initial load use table placeholders. During updates, avoid presenting previous results as matches for new criteria; show a loading state until the current response arrives.

### R4 — Search and filtering

- A labeled search input matches full name or email after trimming surrounding whitespace, case-insensitively.
- Search treats `%` and `_` literally and limits input to 100 characters; the API validates the same limit.
- Debounce search by approximately 300 ms. Status selection applies immediately. Search and status combine with AND semantics.
- Any search, status, or page-size change resets the page to 1. Clear filters resets search/status and page, preserving page size.
- Search/filter/page state is preserved in URL query parameters for back/forward navigation within the session. Invalid query values fall back to safe defaults.
- Cancel superseded requests or ignore their results. A slower old response cannot overwrite newer results or current request status.

### R5 — API request status indicator

- Overview and Users display a labeled request indicator for the current page's data request: Loading, Updated, or Failed. Before its first request, show Not loaded.
- Updated means the most recent relevant request succeeded; it is not a claim of continuous backend availability. Display its completion time.
- Local filter changes awaiting debounce show Updating; do not show an old success indicator as confirmation of new results.
- Loading and failure messages appear beside affected content as well as in the indicator. A failure offers a working Retry action for the current query.
- Timeout requests after a configured interval, proposed default 10 seconds. Distinguish session expiry from network/server failure; do not expose tracebacks or secrets.
- Cancellation due to a newer query is not an error. Login submission has its own progress/error state.
- Success/error changes are announced accessibly without announcing every keystroke. No polling or permanent “API online” badge is required.

### R6 — Responsive navigation

- At desktop widths, a sidebar provides Overview, Users, current-page highlighting, administrator identity, and logout.
- Below the desktop breakpoint, a labeled menu button opens a drawer with the same navigation actions.
- The drawer exposes expanded state, contains keyboard focus while open, closes on Escape, overlay click, or navigation, and returns focus to its trigger when dismissed.
- Direct routes and browser back/forward work. Unknown routes display a useful not-found screen with a working navigation action.
- Check widths 320, 375, 768, 1024, and 1440 px. Summary cards and controls reflow. The document itself never overflows horizontally; the table may use a labeled local scroll region to preserve column relationships.

## 7. Visual and accessibility direction

Visual direction: a restrained light interface, neutral page background, white surfaces, green primary actions, readable system sans-serif typography, and consistent spacing. Use the user-supplied CrediSure logo in the login/navigation brand lockup and favicon. Use semantic design tokens rather than repeating raw styles. Keep navigation, page heading, summary information, and table controls clearly separated.

Use semantic landmarks, headings, form labels, table headers, visible focus, logical tab order, and meaningful icon labels. Aim for WCAG 2.2 AA: normal text contrast at least 4.5:1, large text at least 3:1, and controls with sufficient non-text contrast. Prefer 44 px touch targets. Respect reduced-motion preferences. Treat accessibility as an implementation and verification target, not a certification claim.

Use locally bundled fictional profile portraits for the synthetic directory, with initials as a fallback on image failure. The portrait library is illustrative and reused across the 80 synthetic profiles; no external avatar service or real user photograph is required. No mandatory custom font, decorative animation, chart library, or dark mode. The design skill's generic marketing-layout/dark-mode suggestions are not suitable for this brief; the chosen layout follows dashboard tasks and the accessibility guidance.

## 8. Data and API contract

### Entities

| Entity | Fields |
| --- | --- |
| Administrator | id, normalized email, password hash |
| Directory user | id, full_name, email, role (`admin` or `member`), status (`active`, `inactive`, `pending`), joined_date (`YYYY-MM-DD`) |
| Session | token hash, administrator ID, UTC created_at and expires_at |

Administrator credentials are separate from directory records. Seed 80 synthetic directory records with distinct Nigerian full names and surnames across statuses and roles to exercise multiple pages. Seeding is deterministic and idempotent; never reset data automatically at startup. Recognizable legacy demo records may have their names and matching email addresses upgraded by the explicit seed command; preserve edited profiles and all non-name account data.

### Proposed endpoints

All business endpoints use the `/api` prefix. Authentication and data responses use `Cache-Control: no-store`.

| Method/path | Authentication | Request / successful response |
| --- | --- | --- |
| `POST /api/auth/login` | Public | JSON `{email, password}` → `{access_token, token_type: "bearer", expires_at, administrator: {id, email}}` |
| `GET /api/auth/me` | Bearer session | `{id, email}` |
| `POST /api/auth/logout` | Bearer session | Revoke session; `204` |
| `GET /api/dashboard/summary` | Bearer session | `{total_users, active_users, inactive_users, pending_users}` |
| `GET /api/users` | Bearer session | `search`, `status`, `page`, `page_size` → `{items, total, page, page_size, total_pages}` |
| `GET /api/health` | Public | `200 {status: "ok"}` if application/database check succeeds; otherwise `503` with no internal details |

`GET /api/users` defaults: empty search, omitted status means All, page 1, page_size 10. An out-of-range positive page returns empty items with accurate metadata; the client adjusts once to the last available page when necessary. For total zero, total_pages is zero. Unknown status, invalid page, unsupported page size, and overlong search return `422`. Search and status apply before both count and pagination.

Application error shape: `{error: {code, message, field_errors?}}`. Normalize framework validation errors into this shape. Return `401` for invalid credentials/session, `422` for invalid input, and a generic `500` for unexpected failures. Never return password hashes, session hashes, stack traces, or configuration values.

## 9. Security, quality, and performance

- Verify passwords with a maintained password hashing library using Argon2id; no plaintext storage.
- Generate cryptographically random opaque session tokens, store only their hashes, enforce a proposed 30-minute absolute expiry server-side, and revoke on logout. Do not put tokens in URLs or browser persistent storage.
- Keep administrator email/password, database location, allowed origins, API base URL, and timeouts configurable. Commit a placeholder-only `.env.example`; never expose server secrets as `VITE_*` values.
- Use parameterized database queries and validated pagination bounds. Return only public directory fields.
- Configure explicit CORS origins, avoid logging credentials/tokens, and use HTTPS for any public deployment. CORS is not authentication.
- Keep the assessment local by default. Public exposure requires login throttling and verified hosting configuration before release; this is a conditional deployment gate.
- Use server-side filtering/pagination rather than downloading the directory to filter it. Avoid repeated requests on each keystroke and prevent stale responses.
- Keep dependencies small and pinned through lockfiles or equivalent reproducible dependency files. Validate chosen runtime compatibility during setup.

## 10. Verification and definition of done

| Requirement | Required evidence |
| --- | --- |
| R1 | Backend auth/session tests; frontend validation and expiry tests; browser login/logout flow |
| R2 | Summary aggregation test including zero records; browser loading/failure/success checks |
| R3 | Pagination, ordering, response-field and empty-data tests; responsive table inspection |
| R4 | Combined search/status, literal wildcard, page reset and stale-response tests; browser interaction |
| R5 | Loading, success, timeout, failed retry and cancellation tests/checks |
| R6 | Browser checks at defined widths; keyboard drawer and route navigation checks |

Done means all six rows have evidence, frontend build/type/lint checks and relevant automated tests pass, backend checks pass, no credentials are committed, and setup instructions work from a clean environment. Record checks actually executed and any unverified environments. Documentation alone does not satisfy implementation acceptance.

## 11. Items to confirm during review

These do not block drafting: whether there is an additional assessment PDF or rubric, a deadline, supplied designs/assets, a required external API, or a hosted-demo requirement. Pending that information, use the scope above. Do not begin application implementation until the PRD and implementation plan are reviewed with the user.
