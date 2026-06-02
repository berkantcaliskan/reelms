# Reelms

Reelms is a web-first realtime community platform with a future desktop client.

## Apps

- `apps/web` — React/Vite web app, landing/download pages, legacy Reelms UI and migration-ready feature folders.
- `apps/desktop` — Electron desktop shell, NSIS Windows setup, updater splash and auto-update support.
- `services/api` — Node/Express/Socket.io backend with JSON local storage and Postgres-ready repository driver.
- `packages/shared` — shared constants and types.
- `packages/config` — shared env schemas.

## Local development

Install once from repo root:

```bash
npm install
```

Run backend:

```bash
npm run dev:api
```

Run web:

```bash
npm run dev:web
```

Open:

- Web: http://127.0.0.1:5174/#/signin
- Landing: http://127.0.0.1:5174/#/landing
- Download: http://127.0.0.1:5174/#/download
- API health: http://127.0.0.1:5000/health

## Desktop setup

```bash
npm run dist:win
```

Output:

```txt
apps/desktop/dist-electron/Reelms-Setup-0.1.0.exe
```

## Data

Local beta defaults to JSON storage under `services/api/data/doc-store.json`.
That file is intentionally gitignored. Production target is Postgres.
