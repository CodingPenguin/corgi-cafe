# Corgi Cafe Wall

Corgi Cafe Wall is a live public guestbook for the 24/7 Corgi Cafe at 9 Claude Ln, San Francisco. `/corgi` is the public landing page and `/corgi/chat` is the live guestbook. Anyone can read, but only people at the cafe can post. The UI uses Corgi Insurance's orange, ink, white, gray, and peach brand palette.

## Deployments

- Vercel: https://corgi-cafe.vercel.app/corgi
- Zo Space: https://danmaruchi.zo.space/corgi

The root Vite app and `api/corgi/[action].ts` are the Vercel deployment. The standalone files under `routes/` remain the Zo Space source. Both deployments use the same Supabase messages and Realtime channel.

## Realtime chat

Messages live in the dedicated `corgi-cafe` Supabase project and expire after 24 hours. Supabase Realtime delivers new messages over WebSockets without page refreshes or rapid polling. Realtime Presence powers the anonymous “in the room” count, which represents browsers currently viewing the chat rather than cafe occupancy. The server requires `SUPABASE_CORGI_SERVICE_ROLE_KEY` in Zo Settings → Advanced; the service-role key is never exposed to the browser.

## Presence

Browser geolocation is the primary gate. The API works out of the box with a built-in 150m radius around `37.78995, -122.40435`; no admin setup is required. A registered cafe public IP is an optional fast-path that lets guests on cafe Wi-Fi post without a location prompt. Messages retain a small location or network presence badge.

## Admin setup

Open `/corgi/admin` and enter a passphrase. Set a custom cafe location/radius from your current position or reset to the built-in 9 Claude Ln default; optionally register the cafe network in the collapsed Wi-Fi fast-path section. When `CORGI_ADMIN_SECRET` is unset, the first passphrase of at least six characters claims admin and is stored only as a SHA-256 hash. Set `CORGI_ADMIN_SECRET` in Zo Settings → Advanced to override it. Admin can also forget registered IPs and clear chat history.
