# Reelms beta deployment readiness

Date: 2026-06-02

This beta is intended to run as a real hosted app, not as a Hamachi/LAN test. The recommended split is:

- **Web app:** static Vite build from `apps/web/dist`.
- **API + Socket.IO:** long-running Node.js process on AWS EC2/ECS/Elastic Beanstalk or another Node host.
- **Database:** Supabase/Postgres through the API only. Never expose service role keys to the browser.
- **Realtime scaling:** `REDIS_URL` is required when more than one API instance is running.
- **Media APIs:** microphone, camera and screen sharing require `localhost` during development or real HTTPS in beta/staging/production.

## Required backend env for Supabase beta

```env
NODE_ENV=production
PUBLIC_API_URL=https://api.your-domain.com
PUBLIC_WEB_URL=https://app.your-domain.com
CORS_ORIGINS=https://app.your-domain.com
JWT_SECRET=change-to-a-long-random-secret
REELMS_STORAGE_DRIVER=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
REDIS_URL=redis://...
```

`SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, Google secrets, Spotify secrets, OpenAI keys and AWS keys belong only on the API host.

## Supabase table

```sql
create table if not exists reelms_docs (
  pk text not null,
  sk text not null,
  data jsonb not null,
  updated_at bigint not null,
  primary key (pk, sk)
);

create index if not exists reelms_docs_pk_prefix_idx on reelms_docs (pk text_pattern_ops);
create index if not exists reelms_docs_sk_prefix_idx on reelms_docs (sk text_pattern_ops);
create index if not exists reelms_docs_updated_at_idx on reelms_docs (updated_at desc);
```

## Beta validation flow

Run before pushing/releasing:

```powershell
npm install
npm run typecheck
npm run build:web
npm run build:api
npm run test:local:e2e
```

Manual hosted beta test:

1. Create user A in Chrome normal profile.
2. Create user B in Edge or Chrome incognito.
3. Confirm clear signup errors for duplicate e-mail, duplicate username and weak password.
4. Sign in once with e-mail and once with username.
5. Search user B from user A, send a friend request, accept it from user B.
6. Create a Reelm from user A, join by invite code from user B.
7. Send text messages both ways; refresh both browsers and confirm messages remain.
8. Join a voice channel from both browsers and confirm channel capacity/leave/rejoin behavior.
9. Test screen share only over HTTPS or localhost.

## Known production next steps

- Add S3 presigned upload flow for real file/media uploads.
- Add a TURN server for voice reliability across strict NAT networks.
- Split the large legacy React screen into smaller feature modules after beta stabilization.
