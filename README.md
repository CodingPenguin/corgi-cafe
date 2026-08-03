# Corgi Cafe Wall

Corgi Cafe Wall is a live public guestbook for Corgi Cafe's San Francisco locations at 9 Claude Ln and 2146 3rd St. `/corgi` is the public landing page and `/corgi/chat` is the live guestbook. Anyone can read, but only people at either cafe can post. The UI uses Corgi Insurance's orange, ink, white, gray, and peach brand palette.

## Deployments

- Vercel: https://corgi-cafe.vercel.app/corgi
The root Vite app and `api/corgi/[action].ts` are the production deployment. The standalone files under `routes/` retain the former Zo Space implementation for reference; all Corgi routes and assets were removed from Zo Space on August 2, 2026.

## Realtime chat

Messages live in the dedicated `corgi-cafe` Supabase project and expire after 24 hours. Supabase Realtime delivers new messages over WebSockets without page refreshes or rapid polling. Realtime Presence powers the anonymous “in the room” count, which represents browsers currently viewing the chat rather than cafe occupancy. The server requires `SUPABASE_CORGI_SERVICE_ROLE_KEY` in Zo Settings → Advanced; the service-role key is never exposed to the browser.

## Presence

Browser geolocation is the primary gate. The API works out of the box with 150m radii around 9 Claude Ln (`37.78995, -122.40435`) and 2146 3rd St (`37.762462, -122.388497`); no admin setup is required. A registered cafe public IP is an optional fast-path that lets guests on cafe Wi-Fi post without a location prompt. Messages retain a small location or network presence badge.

## Legacy admin

The former Zo Space admin route remains in `routes/admin.tsx` for reference and is not deployed. Vercel currently uses the built-in two-location configuration.
