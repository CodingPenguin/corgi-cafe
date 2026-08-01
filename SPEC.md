# Corgi Cafe Wall — Spec

A live chat wall for Corgi Cafe at 9 Claude Ln, San Francisco, hosted on Zo Space (danmaruchi.zo.space). Anyone can WATCH from anywhere; you can only POST when browser geolocation puts you within 150m of the built-in cafe location. Owners may optionally register the cafe Wi-Fi's public IP as a zero-prompt fast-path.

## Deliverables — write exactly these files in this directory

1. `routes/api.ts` — Hono API route (deployed at `/api/corgi/:action`)
2. `routes/chat.tsx` — React landing page (deployed at `/corgi`, public)
3. `routes/guestbook.tsx` — React guestbook (deployed at `/corgi/chat`, public)
4. `routes/admin.tsx` — React page (deployed at `/corgi/admin`, private/owner-only)
5. `README.md` — short: what it is, how presence works, how admin setup works

Do NOT create package.json, node_modules, configs, or tests. These files are deployed into an existing Zo Space app; they must be self-contained modules.

## Hard platform constraints (Zo Space)

- `routes/api.ts`: MUST have a single default export `(c: Context) => Response | Promise<Response>` with `import type { Context } from "hono"`. Runs server-side in Bun. May use `node:fs`, `node:crypto`. NO other imports, NO URL/esm.sh imports. Dynamic segment is read with `c.req.param("action")`.
- `routes/chat.tsx`, `routes/guestbook.tsx`, and `routes/admin.tsx`: each MUST have a default-export React component. Use `react` and `lucide-react`; `routes/guestbook.tsx` may additionally import the pinned browser ESM build of `@supabase/supabase-js`. Style with Tailwind CSS classes (Tailwind 4 is available). No CSS files.
- All `fetch()` calls from pages to the API MUST include header `"Accept": "application/json"`.
- Each file is standalone — no imports between route files; duplicate small helpers if needed.

## Data persistence

Messages live in `public.corgi_messages` in the dedicated Supabase project and are retained for 24 hours. The API uses `SUPABASE_CORGI_SERVICE_ROLE_KEY` for validated inserts and administrative deletion. Anonymous clients may read recent messages and subscribe to Realtime, but cannot insert directly.

Admin and location configuration remains in the JSON file at absolute path `/home/workspace/Projects/corgi-cafe/data.json`, created on demand by the API. Shape:

```json
{
  "adminHash": null,
  "networkIps": [],
  "cafeLocation": null
}
```

- `adminHash`: hex sha256 of the admin passphrase, or null if unclaimed
- `networkIps`: registered cafe public IPs (strings)
- `cafeLocation`: custom override `{ "lat": number, "lng": number, "radiusM": number }`, or null to use the built-in default `{ "lat": 37.78995, "lng": -122.40435, "radiusM": 150 }`
Serialize all writes through a single in-process promise chain (simple mutex) to avoid read-modify-write races. Read the file fresh on each request (don't cache reads across requests).

## API — `/api/corgi/:action`

Client IP = first entry of `x-forwarded-for` (trimmed), else `x-real-ip`, else `"unknown"`.

Presence check (given optional lat/lng from client):
1. IP is in `networkIps` → allowed, via "wifi"
2. Else if lat/lng provided AND haversine distance from the effective location (`cafeLocation` or the built-in default) ≤ radiusM → allowed, via "geo"
3. Else not allowed. Never treat `"unknown"` IP as allowed.

Actions:

- `GET messages` (query params: `lat`, `lng` optional) → `{ "messages": [last 100, oldest first], "presence": { "allowed": boolean, "via": "wifi" | "geo" | null }, "configured": true }`. `configured` remains for API compatibility and is always true because the default location exists.
- `POST messages` body `{ name, text, lat?, lng? }` → run presence check; if not allowed return 403 `{ "error": "not-at-cafe" }`. Validate: text non-empty after trim, ≤ 500 chars; name trimmed, default "Anonymous Corgi", ≤ 30 chars. Rate limit: in-memory Map of IP → last post ts, reject < 2000ms apart with 429 `{ "error": "too-fast" }`. On success insert into Supabase (id = crypto.randomUUID()), return `{ "ok": true, "message": <the message> }`, and opportunistically remove messages older than 24 hours.
- `GET config` → `{ "claimed": boolean, "networkCount": number, "location": { lat, lng, radiusM, isDefault }, "envSecret": boolean }`, using the effective location (no secrets/IPs leaked).
- `POST admin` body `{ secret, op, lat?, lng?, radiusM? }`:
  - Auth: if env `CORGI_ADMIN_SECRET` is set, `secret` must equal it. Otherwise first-claim: if `adminHash` is null, hash `secret` (min 6 chars) and store it (this claims admin); else sha256(secret) must equal `adminHash`. Wrong secret → 401 `{ "error": "bad-secret" }`.
  - Ops: `register_ip` (add caller IP to networkIps, dedupe; respond with `{ ok, ip }`), `forget_ips` (clear list), `set_location` (requires lat, lng; radiusM default 150, clamp 20–1000), `clear_location` (revert to the built-in default), `clear_chat`.
- Unknown action or method → 404/405 JSON error.

All responses are JSON via `c.json(...)`.

## Landing page — `/corgi`

Preserve the full-bleed flying-corgi hero and link its primary call to action to `/corgi/chat`. The landing page has no chat transport or state.

## Guestbook page — `/corgi/chat`

Full-screen live cafe guestbook with a warm paper surface, subtle grain, compact identity bar, accurate room count, chronological ledger, and pinned composer. Secondary room details live behind one info icon; there is no welcome card or permanent sidebar.

Behavior:
- Fetch `GET /api/corgi/messages` once for initial history and posting presence, then receive new messages through a Supabase Realtime WebSocket subscription. No rapid polling or post-send refetch.
- Join the public `corgi-room` Presence channel with an anonymous browser ID and show the number of unique connected browsers as “N in the room.” This is chat viewership, not cafe occupancy.
- Message list: name, text, relative timestamp ("just now", "4m ago", "2h ago", else local time), and a small location/network icon. Auto-scroll to newest only when the user is already near the bottom.
- Presence banner:
  - allowed → "🟢 You're at the cafe — say hi!" and enabled composer (name input persisted in localStorage `corgi-name`, text input, send button; Enter sends).
  - not allowed → "👀 Watching from afar. Come by 9 Claude Ln to join the chat." with an "I'm at the cafe 📍" button that calls `navigator.geolocation.getCurrentPosition`, stores coords in sessionStorage `corgi-geo`, and refetches; if still not allowed, show "Hmm, you don't seem to be in range yet." Composer hidden/disabled.
  - User-facing chat copy never mentions Wi-Fi; the legacy 📶 message badge remains supported.
- Handle fetch errors quietly (keep last known state, small "reconnecting…" hint).
- Empty state: "No barks yet. Be the first at the cafe. 🦴"
- Mobile-friendly single column, max-w ~2xl, full-height layout with composer pinned at bottom.

## Admin page — `/corgi/admin`

Clean white-card layout using the same Corgi palette and theme-variable pattern. Sections:
- Passphrase input (persisted in localStorage `corgi-admin-secret`), with explainer: "First passphrase entered claims admin. Set CORGI_ADMIN_SECRET in Zo Settings → Advanced to override."
- Status (from `GET config`): claimed?, network count, effective lat/lng/radius with a `default (9 Claude Ln, SF)` or `custom` tag, env secret active?
- Primary location controls: "Set cafe location to where I'm standing" (geolocation + radius number input, default 150m) and "Reset to default location".
- Collapsed secondary "Optional: cafe Wi-Fi fast-path" section with register/forget buttons and a short zero-location-prompt explanation.
- "Clear chat" remains separate and requires `confirm()` first.
- Show each op's result inline (success/error message). Refresh status after each op.

## Code style

Clean TypeScript/TSX, no code comments, small helper functions. Match idiomatic React 19 (hooks, no classes).
