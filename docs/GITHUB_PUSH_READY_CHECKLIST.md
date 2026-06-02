# GitHub push-ready checklist

This source tree is prepared for a GitHub repository. It intentionally does not include generated dependencies, build output, local data, release artifacts, or secrets.

## Before first push

```powershell
npm install
npm run build:web
npm run build:api
npm run build:desktop
```

If those pass locally, initialise Git and push:

```powershell
git init
git add .
git commit -m "Initial Reelms source"
git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

## Do not commit

- `node_modules/`
- `dist/`
- `dist-electron/`
- `.env`, `.env.local`, `.env.production`
- `services/api/data/doc-store.json`
- `*.exe`, `*.blockmap`, `latest.yml`

## Local setup for collaborators

```powershell
npm install
copy services\api\.env.example services\api\.env
copy apps\web\.env.example apps\web\.env
npm run dev:api
npm run dev:web
```

Web: `http://127.0.0.1:5174/#/signin`
API health: `http://127.0.0.1:5000/health`

## Production direction

- Web deploy uses `apps/web/dist` after `npm run build:web`.
- API deploy uses `services/api/dist` after `npm run build:api`.
- Local development can use JSON storage.
- Staging/production should use `REELMS_STORAGE_DRIVER=postgres` and `DATABASE_URL`.
- Redis is optional locally, required once Socket.io is horizontally scaled.
