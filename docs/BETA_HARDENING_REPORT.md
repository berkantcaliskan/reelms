# Reelms beta hardening report

Date: 2026-06-02

## Result

The uploaded source tree was structurally close to a beta, but the first version had several backend/realtime trust and concurrency gaps that could surface as soon as multiple users use the same rooms at the same time. This revision hardens those paths and is intended to be the GitHub-pushable solid beta baseline.


## Fixed in the second deep pass

- Username login now resolves inside `/auth/login`; the client no longer needs a protected lookup before signing in.
- Registration now validates e-mail format, 8+ character passwords and 3-30 character usernames consistently on client and server.
- Register/profile writes return clearer error codes for duplicate e-mail, duplicate username, invalid e-mail, invalid username and weak password.
- Availability checks now work both before login and while logged in; a user's own username/e-mail no longer appears as incorrectly taken.
- Reelm invite-code creation now uses a server-side unique index and rolls back reserved codes on creation failure.
- Moderation endpoint now requires auth, preventing unauthenticated public abuse of the backend moderation route.
- Voice room counts and capacity checks now use Socket.IO `fetchSockets()`, so they work correctly with the Redis adapter in multi-instance beta hosting.
- Voice join events now use server-side public profile data instead of client-supplied names/photos.
- Legacy signup/settings paths were aligned with the hardened auth/profile endpoints.
- Hamachi-specific scripts/docs were removed; beta validation is now aimed at hosted HTTPS or localhost.
- Spotify OAuth now starts through an authenticated POST endpoint and no longer puts the JWT token in the browser URL/query string.
- Spotify now-playing and disconnect routes require authenticated API calls.
- The local E2E script now checks negative cases: duplicate credentials, username login, spoofed friend/message/reaction identity, non-member access and moderation auth.

## Fixed in this pass

- Added atomic `putDocIfAbsent` support to JSON, Postgres and Supabase storage drivers.
- Made email registration atomic so two simultaneous register requests cannot create two users for the same email.
- Made username and email profile indexes server-owned and collision-safe.
- Fixed frontend username/email availability response handling.
- Protected Reelm document reads/writes with member/admin checks.
- Protected message and reaction routes with message-key access checks.
- Server now overwrites sender/user identity on messages and reactions instead of trusting client-sent IDs.
- Blocked non-members from reading/writing arbitrary room channels if they know the channel key.
- Protected Socket.IO room joins: reelm, text channel and voice channel joins now check membership.
- Hardened voice signaling so users can only signal/broadcast inside the same joined voice room.
- Added voice channel capacity enforcement on the server.
- Added cleanup for switching voice rooms and disconnecting from voice rooms.
- Hardened friend request/accept/remove flows so client-supplied names/photos cannot spoof another user.
- Added missing user bootstrap keys used by the UI: `pinned_items`, `sounds`, `body_font`.
- Removed committed local `.env` files and local runtime `doc-store.json` from the final source tree.

## Verified commands

```bash
npm run typecheck
npm run build:web
npm run build:api
npm run build:desktop
```

Also verified with the local API E2E chain:

```bash
npm run test:local:e2e
```

The local E2E chain now includes the security/user-flow checks below:

- invalid e-mail and weak password registration failures return clear `400` errors
- duplicate username and duplicate e-mail registration return `409`
- username login resolves to the correct user
- wrong password returns `401`
- own username availability works while logged in, and taken username shows unavailable to another user
- friend request identity spoofing is ignored
- non-member channel/reelm document access returns `403`
- message sender spoofing is sanitized to the authenticated user
- reaction user spoofing is sanitized to the authenticated user
- unauthenticated moderation calls return `401`

## Production/beta requirements

For a real beta deployment, do not use local JSON storage as the shared production data source. Use one of:

- `REELMS_STORAGE_DRIVER=supabase` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `REELMS_STORAGE_DRIVER=postgres` with `DATABASE_URL`

Use `REDIS_URL` when running more than one API instance, otherwise Socket.IO room state is only single-node.

Use a strong production `JWT_SECRET`. The development default is blocked by validation in production.

Voice/camera/screen share require HTTPS or localhost in modern browsers. Hosted beta tests should run over HTTPS; plain HTTP should only be considered a limited local backend/text test.

## Known beta limitations

- Media upload is currently metadata-first/local-style. Full S3 object upload/presigned URL flow is still the correct next production step for large files.
- The app still contains a large legacy React screen. It builds, but long-term maintainability will improve by gradually splitting it into feature modules.
- Group chat persistence is still mostly client-list based; for a Discord-scale future, add server-owned group conversation create/invite/member routes.
