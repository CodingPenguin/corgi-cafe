# Corgi Cafe Wall

Corgi Cafe Wall is a location-gated live chatroom for Corgi Cafe at 9 Claude Ln. `/corgi` is the public landing page and `/corgi/chat` is available only after a successful location check from the cafe. The upcoming 2146 3rd St location appears on the landing page but does not pass the geogate yet. The UI uses Corgi Insurance's orange, ink, white, gray, and peach brand palette.

## Deployments

- Vercel: https://corgi-cafe.vercel.app/corgi
The root Vite app and `api/corgi/[action].ts` are the production deployment. The standalone files under `routes/` retain the former Zo Space implementation for reference; all Corgi routes and assets were removed from Zo Space on August 2, 2026.

## Realtime chat

Messages live in the dedicated `corgi-cafe` Supabase project and expire after 24 hours. Supabase Realtime delivers new messages over WebSockets without page refreshes or rapid polling. Realtime Presence powers the anonymous “in the room” count, which represents browsers currently viewing the chat rather than cafe occupancy. The server requires `SUPABASE_CORGI_SERVICE_ROLE_KEY` in Zo Settings → Advanced; the service-role key is never exposed to the browser.

## Presence

Browser geolocation gates both reading and posting. The API uses a 150m radius around 9 Claude Ln (`37.78995, -122.40435`). The 2146 3rd St location is marked coming soon and is not active in the gate. Messages retain a small location badge.

## Legacy admin

The former Zo Space admin route remains in `routes/admin.tsx` for reference and is not deployed. Vercel currently uses the built-in two-location configuration.
