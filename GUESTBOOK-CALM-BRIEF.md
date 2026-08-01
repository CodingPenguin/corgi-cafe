# Guestbook redesign: corgi.insure product language + optimistic send

Scope: `routes/guestbook.tsx` ONLY. Do not touch `routes/chat.tsx` (landing), `routes/api.ts`, or `routes/admin.tsx`.

## Why

Danny's feedback on the current guestbook: "something about this feels like too much." Compared against corgi.insure (the brand reference), our page floods the screen with orange, boxes every row in 2px black rules, and sets everything in all-caps black. corgi.insure is the opposite: calm, light, rounded, sentence case, with orange used only as an accent. The landing hero at `/corgi` keeps the loud poster energy; the guestbook should feel like Corgi's *product* — quiet, warm, precise.

## Extracted corgi.insure design tokens (measured from the live site)

- Page background: `#f6f6f6`
- Text: near-black `#191919` headings (weight 500–600), `#4a4a4a` body, `#7b7b7b` muted
- Font: **Geist**, sentence case everywhere. NO uppercase, NO letter-spacing tracking.
- Hairlines: `#e1e1e1` 1px borders, rounded corners `12px`–`16px`
- Accent: orange `#ff5c00`, darker edge `#cc4a00`
- Their signature button (measured): an outer wrapper with `background: #cc4a00; border-radius: 12px; padding-bottom: 4px`, and the button itself inside with `background: #ff5c00; border-radius: 12px; color: white; font-weight: 500`, sentence-case label. The 4px darker base reads as a pushable 3D edge. On `:active` the inner button should translate down ~4px (pressing flat). Dark variant: inner `#191919` on a `#000` base.
- One editorial flourish: their hero sets an accent phrase in an *italic serif* in orange ("Speed of Compute."). That's the single decorative move.

## Fonts

Load via a `<style>` tag inside the component:
```
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
```
Body/UI: Geist. The empty-state headline uses Instrument Serif italic.

## Redesign spec (structure stays: header / scrolling ledger / composer footer / info sheet)

**Page**: bg `#f6f6f6`, text `#191919`, Geist. Remove the orange flood, remove the giant `GUESTBOOK` watermark `before:` pseudo-element entirely, remove ALL `uppercase`/`tracking-*`/`font-black` styling.

**Header**: white bg, 1px bottom border `#e1e1e1`. Left: circular back link (1px `#e1e1e1` border, gray arrow, hover: border `#191919`), then "Corgi Chat" (`text-lg font-semibold`, sentence case) with "9 Claude Lane" below as a small `#7b7b7b` link (hover orange) still pointing to Google Maps. Right: live status as small gray text `Live · N in the room` with the green/amber dot (keep reconnecting logic), and the info button styled like the back button.

**Ledger**: centered column `max-w-3xl`. Messages render on one continuous white sheet: `bg-white rounded-2xl border border-[#e1e1e1]` wrapping all rows, rows divided by 1px `#ececec` hairlines (`divide-y`), each row `px-5 sm:px-7 py-5`. Row content: first line = name (`font-semibold text-[15px] text-[#191919]`, displayed as typed — NOT uppercased), a small orange Wifi/MapPin icon (size 12) right after the name, then `·  18h ago` in `text-xs text-[#7b7b7b]`; message text below in `text-[15px] leading-7 text-[#4a4a4a]`. Add `py-2` breathing room above/below the sheet (`my-6`).

**Markdown rendering**: keep ALL existing tokenize/linkify/render logic and behavior. Restyle only: links become `font-medium text-[#ff5c00] underline decoration-1 underline-offset-2 hover:text-[#cc4a00]` (drop the bold/heavy decoration), inline code `bg-[#f1f1f1] text-[#191919]`, code blocks `bg-[#191919] text-white rounded-xl` (drop the uppercase language label styling — make it lowercase `text-[10px] text-white/40`), blockquote border stays orange but text `#7b7b7b`.

**Empty state**: centered, Instrument Serif italic, orange `#ff5c00`, `text-4xl sm:text-5xl`: `The first page is yours.` with a sub-line below in `text-sm text-[#7b7b7b]` (Geist): `Notes last 24 hours, then the page turns.`

**Loading state**: small `text-sm text-[#7b7b7b]`, sentence case: `Opening the guestbook…`

**Composer footer** (allowed state): white bg, 1px top border `#e1e1e1`. Toolbar row: gray icon buttons (`text-[#7b7b7b] hover:text-[#191919] hover:bg-[#f1f1f1] rounded-lg`), and replace the "POSTING LIVE" label with a small right-aligned `text-xs text-[#7b7b7b]` reading `Posting live` with a tiny green dot. Inputs: `rounded-xl border border-[#e1e1e1] bg-white` (focus: `border-[#ff5c00]`), name input then textarea as now, both `text-sm`, no uppercase anywhere. Send button: the signature 3D button — outer `rounded-xl bg-[#cc4a00] pb-1`, inner `rounded-xl bg-[#ff5c00] text-white grid place-items-center size-11 transition-transform active:translate-y-1` with the Send icon; disabled state `opacity-40`. Keep Enter-to-send and the 500 char limit.

**Locked footer**: white bg, top hairline. Text `text-sm text-[#4a4a4a]`: `Watching from afar — come by 9 Claude Lane to join.` (range note below in `text-xs text-[#cc4a00]`). The "I'm at the cafe" button uses the same 3D orange button pattern (inner `h-10 px-4 text-sm font-medium` with MapPin icon, sentence case).

**Info sheet**: `rounded-2xl border border-[#e1e1e1] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.10)]` — remove the hard offset `shadow-[10px_10px_0_#ff5c00]`. Title `text-sm font-semibold` sentence case: `About the room`. Body text `text-sm text-[#4a4a4a]`.

## Optimistic send (behavior change)

Current: composer waits for the POST and only clears on success; the message appears when the Realtime INSERT echoes back. Feels slow.

New flow in `sendMessage()`:
1. Immediately append an optimistic message: `{ id: localId, name: name.trim() || "Anonymous Corgi" (this is the server's exact fallback), text: cleanText, ts: Date.now(), via: "geo", pending: true }` where `localId = \`local-${crypto.randomUUID()}\``. Extend the `Message` type with optional `pending?: boolean` and `failed?: boolean`.
2. Clear the composer and set `nearBottomRef.current = true` immediately (before the fetch).
3. POST as now. On success, the API returns `{ ok: true, message }` — replace the optimistic entry (by localId) with the server message (its real id), keeping `pending: false`. The Realtime INSERT for the same server id will then dedupe naturally through `mergeMessages` (id map).
4. On failure: mark the optimistic entry `failed: true, pending: false` and restore nothing (text stays sent-looking but marked). Do NOT set the global `reconnecting` flag for a single failed send.
5. `mergeMessages` must preserve local pending/failed entries: they have unique local ids so the id-map merge already keeps them; ensure the `.slice(-100)` can't drop a pending message (acceptable at this scale — leave as is).

**Pending UI**: the row renders at `opacity-60` with the timestamp slot showing `Sending…` (`text-xs text-[#7b7b7b]`).
**Failed UI**: row at full opacity, timestamp slot shows `Not sent` in `text-xs text-[#cc4a00]` plus a `Retry` text button (`text-xs font-medium text-[#ff5c00] underline`) that re-POSTs the same text/name: on retry success replace by server message; on another failure keep failed state. Also add a small `Dismiss`/x affordance to remove a failed row.
`sending` state should no longer disable the composer — multiple quick sends are fine; keep the server's 2s rate limit as the backstop (a 429 just lands as a failed row).

## Hard constraints

- Realtime subscription, presence counting, geolocation check flow, name persistence, scroll anchoring, Supabase client usage, and all API calls stay byte-for-byte behaviorally identical apart from the optimistic-send changes above.
- No new dependencies. Keep the esm.sh supabase import exactly as is.
- Sentence case everywhere. No `uppercase`, no `tracking-[…]`, no `font-black` anywhere in the file when done.
- Mobile: same layout, timestamps move under the name like now is fine, but keep it calm; no horizontal overflow at 390px.
- File must compile as valid TSX (it's deployed as a Zo Space page route).

## Acceptance checklist

1. `bun build --target=browser` (or equivalent parse) passes on the file.
2. Zero `uppercase|tracking-\[|font-black` matches in the file.
3. Optimistic path: send appends instantly, composer clears instantly, server echo dedupes (no double rows), failure shows Not sent + Retry.
4. All existing handlers (checkLocation, wrapSelection, saveName, presence, clear broadcast) untouched in behavior.
