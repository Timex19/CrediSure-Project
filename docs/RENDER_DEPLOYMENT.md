# Render backend deployment

The selected assessment setup uses Render Free for the API and Render Free PostgreSQL for durable storage. Render's free database expires 30 days after creation; it is not permanent free storage. The web service sleeps after 15 idle minutes, and a cold start can take about a minute. The frontend's default ten-second timeout can expire during a cold start; open the health URL first or allow a longer deployed request timeout. See [Render's free-plan limits](https://render.com/docs/free).

## Current assessment deployment

Deployed on 5 November 2026 from commit `36dd46233f7889005532f8629b4d5a1f9bfdfcdc`:

- API base: `https://credisure-api-gtfm.onrender.com/api`.
- [Health check](https://credisure-api-gtfm.onrender.com/api/health) and [interactive API documentation](https://credisure-api-gtfm.onrender.com/docs). The bare `/` route is not a frontend page.
- [Render service dashboard](https://dashboard.render.com/web/srv-dbm4g3jbc2fs7389tvn0).
- Service `srv-dbm4g3jbc2fs7389tvn0`; database `dpg-dbm4d2mc6qcc73fv1egg-a`; both Free in Frankfurt.
- Database expiry: 5 December 2026. Export/migrate or upgrade before expiration if the assessment must remain available.
- Hosted email/password handoff: `.verification/render/production.env` on the development computer. This ignored file and Render's `.env` secret file contain a separate strong hosted password. Local development credentials were not changed. Do not commit or share the file.

Live API checks and a service restart confirmed authentication, summary counts, directory search/filter/pagination, logout revocation and survival of the account, data and an existing unexpired session. All verification sessions were revoked afterward. The database external allowlist is empty. The frontend is still local, and no frontend origin has been added to CORS.

## Configuration

The [Render Blueprint](../render.yaml) defines:

- Python 3.13.9, root directory `backend`, free plan, Frankfurt region.
- Build: `pip install -r requirements.txt`.
- Start: `python -m app.serve`.
- Health check: `/api/health`.
- A separate PostgreSQL database in the same region, accessed through its internal connection URL with TLS. External database access is disabled.
- Explicit manual deploys, one API worker and one concurrent login request to bound password-hashing work on the free instance.
- Administrator credentials supplied through Render's secret configuration. They are never stored in the Blueprint or committed files.
- An empty CORS allowlist until the actual frontend origin is supplied. Same-origin API routing does not need CORS. Do not use a wildcard.

The CLI can create equivalent resources directly. If resources were created through the CLI, do not blindly apply the Blueprint afterward: inspect Render's plan first so you do not provision duplicates. The Blueprint is a validated reproducible specification, not proof that the deployment is Blueprint-managed.

## Startup and data

Hosted startup requires `CREDISURE_DATABASE_URL` and refuses an ephemeral SQLite fallback. It initializes the schema, creates the configured administrator only if none exists, and seeds the 80 synthetic Nigerian demo profiles idempotently. Credentials, sessions and users are stored in PostgreSQL. Startup does not upload the local SQLite database or reset an existing administrator password. Use the explicit maintenance command for an authorized credential change.

Use a strong, unique hosted administrator password. Keep it in Render secret configuration and an ignored local handoff file; do not publish it in the repository, deploy logs or assessment screenshots. Local development credentials remain separate.

## Verify after deployment

1. Confirm the Render deploy is live at the expected commit and on the Free plan.
2. Check HTTPS `/api/health` returns `200` with `{"status":"ok"}`.
3. Verify unauthenticated directory/summary calls return `401` and wrong credentials produce a generic error.
4. Sign in, check summary counts `80/48/16/16`, search/filter/paginate the directory, and verify logout revokes the token.
5. Restart the service, then verify a still-valid pre-restart session and the administrator account remain usable.
6. Confirm the database external IP allowlist is empty after any temporary deployment checks.
7. When the frontend is hosted, configure its exact CORS origin or same-origin proxy, set its API URL, and verify the browser against the deployed API.

The application limiter is process-local and resets on restart. Forwarded headers are deliberately not trusted by the hosted entry point; users behind the ingress can share the same limit. Multiple instances need shared throttling. HTTPS ingress, MFA and frontend-host CSP/frame protections remain separate from the application login controls.

Official references: [FastAPI deployment](https://render.com/docs/deploy-fastapi), [Blueprint fields](https://render.com/docs/blueprint-spec), [PostgreSQL connections and TLS](https://render.com/docs/postgresql-creating-connecting), [secret files](https://render.com/docs/configure-environment-variables).
