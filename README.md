# Corgi Cafe Wall

Corgi Cafe Wall is a location-gated live chatroom for Corgi Cafe at 9 Claude Ln. `/` is the public landing page and `/chat` is available only after a successful location check from the cafe. The upcoming 2146 3rd St location appears on the landing page but does not pass the geogate yet. The UI uses Corgi Insurance's orange, ink, white, gray, and peach brand palette.

## Deployments

- Vercel: https://corgi-chat.vercel.app/
The root Vite app and `api/corgi/[action].ts` are the production deployment. The standalone files under `routes/` retain the former Zo Space implementation for reference; all Corgi routes and assets were removed from Zo Space on August 2, 2026.

## Realtime chat

Messages live in the dedicated `corgi-cafe` Supabase project and expire after 24 hours. Supabase Realtime delivers new messages over WebSockets without page refreshes or rapid polling. Realtime Presence powers the anonymous “in the room” count, which represents browsers currently viewing the chat rather than cafe occupancy. The server requires `SUPABASE_CORGI_SERVICE_ROLE_KEY` in Zo Settings → Advanced; the service-role key is never exposed to the browser.

Each browser keeps a random anonymous ID in local storage. New messages store that ID so a visitor's own bubbles remain orange and right-aligned after refreshes and later visits from the same browser. No account or personal identifier is involved.

The creator badge is claimed through a private link backed by `CORGI_CREATOR_CLAIM_SECRET`. A successful claim sets a one-year, signed HttpOnly cookie using `CORGI_CREATOR_COOKIE_SECRET`. The posting API verifies that cookie and is the only code allowed to mark a message as coming from the creator. Rotate the claim secret after the intended devices are claimed to close the link without invalidating their cookies.

## Presence

Browser geolocation gates both reading and posting. The API uses a 150m radius around 9 Claude Ln (`37.78995, -122.40435`). The 2146 3rd St location is marked coming soon and is not active in the gate. Messages retain a small location badge.

## Legacy admin

The former Zo Space admin route remains in `routes/admin.tsx` for reference and is not deployed. Vercel currently uses the built-in two-location configuration.
