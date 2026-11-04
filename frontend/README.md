# CrediSure Frontend

React + TypeScript, scaffolded with the official Vite react-ts template. Includes React Strict Mode, hot module replacement, TypeScript configuration and Oxlint. Dependency versions are recorded in package-lock.json.

## Setup

Use Node.js 22.12+ on the Node 22 release line or a newer supported LTS release. Run from this directory:

```powershell
npm ci
npm run dev
```

Vite prints the local development address. No environment configuration is required yet.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run typecheck` | Check TypeScript without emitting build output |
| `npm run lint` | Run Oxlint |
| `npm run build` | Check TypeScript and build into dist/ |
| `npm run preview` | Serve the production build locally after building |

## Scope

The default Vite starter screen is retained. Login, dashboard, directory, routing, API integration and automated feature tests will be added in later implementation steps. No backend is currently required.

See the [PRD](../docs/PRD.md) and [implementation plan](../docs/IMPLEMENTATION_PLAN.md) for intended scope. Tooling reference: [Vite getting started](https://vite.dev/guide/).
