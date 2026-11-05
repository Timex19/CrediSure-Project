# Firebase frontend deployment

Live site: [https://credisure-a28d1.web.app](https://credisure-a28d1.web.app). The alternate [firebaseapp.com domain](https://credisure-a28d1.firebaseapp.com) serves the same site. Firebase project/site: `credisure-a28d1`.

The frontend calls `https://credisure-api-gtfm.onrender.com/api` directly. Render allows only these two exact production frontend origins. Its database, administrator credentials and other environment variables were preserved. The backend was redeployed from existing commit `3682ac76bf5b87083087b7e09b7d9d3734524464` to apply the CORS setting; no backend application code changed for this deployment.

## Build and deploy

From `frontend`:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run deploy:hosting
```

`deploy:hosting` builds with Vite and runs `firebase deploy --only hosting`. `.firebaserc` selects the initialized Firebase project; an explicit `--project credisure-a28d1` can also be supplied to the Firebase CLI. No Firebase Auth, Firestore, Functions or other services are deployed.

The initialized Hosting configuration originally pointed at `public`, which contained Firebase's generated welcome page. It now serves `dist`, and the generated placeholder was removed so it cannot overwrite Vite's application entry point. The SPA rewrite allows direct loads and refreshes of `/login`, `/overview` and `/users` with query parameters.

`.env.production` intentionally contains only public Vite settings: the Render API base URL and a 90-second timeout to accommodate Render Free wake-up delays. It is the narrow exception to the `.env.*` Git ignore rule; credentials remain ignored. Existing `.env` local development proxy settings are unchanged. API URL changes also require updating Firebase's CSP `connect-src` and backend CORS for the new frontend origins.

## Headers and caching

Firebase serves HTTPS. Hosting configuration adds CSP, nosniff, frame denial, no-referrer and restrictive browser feature permissions. Scripts load from the same origin; API connections are restricted to the configured Render origin. Existing CSS inline styles are allowed for avatar/chart rendering. HTML is revalidated, while Vite's hashed `/assets` files have one-year immutable caching.

## GitHub deployment

The initialized workflows were corrected for the monorepo: Node 22, npm cache using `frontend/package-lock.json`, install/check/test/build in `frontend`, and `entryPoint: frontend` for Firebase's official deployment action. The existing `FIREBASE_SERVICE_ACCOUNT_CREDISURE_A28D1` repository secret was confirmed by name only; its value was not retrieved or committed.

Main-branch frontend/workflow changes deploy live. Deployment jobs are serialized. Same-repository PRs can deploy preview channels; fork PRs cannot access the deployment secret. Preview origins require explicit backend approval/configuration before login works. Production CORS does not grant wildcard access to preview channels. Documentation-only changes do not trigger a live deployment.

The [first main-branch workflow run](https://github.com/Timex19/CrediSure-Project/actions/runs/42005127455) completed successfully for commit `a8aa5cd`: dependency installation, type checking, linting, 24 tests, production build and Firebase live deployment all passed. No PR preview deployment was run for this change.

## Verification

24 frontend tests, TypeScript checks, Oxlint, Prettier and the production build passed. An isolated Chromium browser verified the actual Firebase/Render combination: protected deep link, login, counts `80/48/16/16`, status filtering, pagination, refresh preserving route/page/session expiry, case-insensitive search, mobile overflow, logout and logged-out refresh. No browser JavaScript or CSP errors were observed. Hosted credentials came from the ignored `.verification/render/production.env`; they were not placed in browser build settings or screenshots of password fields.

Render Free can sleep after inactivity; the longer production timeout does not guarantee availability. The selected free PostgreSQL database expires on 5 December 2026. See [Render limits](https://render.com/docs/free). Safari/Firefox, physical phones, a penetration test and a load test were not performed.

Official references: [Firebase Hosting configuration](https://firebase.google.com/docs/hosting/full-config), [Firebase GitHub integration](https://firebase.google.com/docs/hosting/github-integration), [deployment action options](https://github.com/FirebaseExtended/action-hosting-deploy).
