# Reelms Supabase / Realtime Readiness

## Important hosting decision

Supabase can be used as the production data layer for `reelms_docs`, but Supabase is not a long-running Node.js + Socket.io host. The Reelms API must still run on a Node-capable host such as Railway, Render, Fly.io, VPS, AWS EC2/ECS, or similar.

Recommended split before AWS:

- Web landing/app: Vercel/Netlify/Squarespace for marketing only, or Vite static host.
- API + Socket.io: Node host.
- Database: Supabase Postgres, or local JSON for development.
- Realtime scale: Redis when multiple API instances are used.

## Supabase setup

Create the table in Supabase SQL editor:

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

Then configure API environment:

```env
REELMS_STORAGE_DRIVER=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Never put the service role key in `apps/web/.env`. It belongs only to the backend/API host.

## Local two-user verification

Start API:

```powershell
npm run dev:api
```

Start local web:

```powershell
npm run dev:web
```

Run backend E2E chain:

```powershell
npm run test:local:e2e
```

This verifies:

- register/login
- profile persistence
- friend request + accept
- Reelm create
- invite code join
- member synchronization
- message persistence/readback
- debug state member verification

Manual browser test: use Chrome normal profile for user A and Edge/incognito for user B.

## Voice/screen-share note

Voice, camera and screen-share require `localhost` or HTTPS in modern browsers. For hosted beta tests, use real HTTPS; plain HTTP should only be treated as a limited local text/room/backend test.
