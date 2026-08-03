# Guestbook: doodle splash + chat bubbles

Scope: `routes/guestbook.tsx` AND `src/pages/CorgiGuestbook.tsx` (the Vercel twin — apply the identical redesign to both; they differ only in the supabase import line and one locked-footer copy string). Do NOT touch `routes/chat.tsx`, `routes/api.ts`, `routes/admin.tsx`, `src/pages/CorgiLanding.tsx`, or `api/corgi/[action].ts`.

## Why

Danny's feedback with a reference image: the chat scroll area should sit on a playful doodle wallpaper (white ground, black line-art cafe doodles — coffee cups, croissants, stars, paw prints — with sparse orange accents and a big flat orange corgi head on the right edge), and messages should read as chat bubbles that pop with shadow, not a flat divided list. Stay on brand with corgi.insure: light, rounded, Geist, sentence case, orange `#ff5c00` accents.

## Asset

`/images/corgi-doodle.webp` (1672x941) — already uploaded to the Zo Space assets and already present at `public/images/corgi-doodle.webp` in this repo. Reference it as `/images/corgi-doodle.webp` in BOTH files.

## Splash (scroll area background)

The message scroll container (the `listRef` div) becomes the wallpaper surface:

- `backgroundImage: url('/images/corgi-doodle.webp')`, `background-size: cover`, `background-position: center` via an inline style or arbitrary Tailwind classes.
- Lay a soft white veil over it so bubbles and text stay readable but the doodles clearly show through: an absolutely-positioned inset-0 layer `bg-white/55` (tune 50–60%) UNDER the messages, or a `linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55))` stacked in the same background shorthand. The gradient approach is simpler and avoids z-index games — prefer it.
- Empty state and loading state render on the same wallpaper.
- Header and footers stay clean white with the existing hairlines. The wallpaper belongs to the scroll area only.

## Bubbles (replace the single white sheet + divide-y list)

Remove the outer `divide-y … rounded-2xl border bg-white` sheet wrapper. Each message renders as its own bubble in a vertical flex column with `gap-3`, still centered `max-w-3xl`, `px-3 sm:px-6 py-6`.

**Mine vs. theirs:** track message ids this browser sent. Keep a `Set<string>` in a `useRef` (`mineRef`): add the optimistic `localId` when sending, and when the POST succeeds and you swap in the server message, add the server id too (before removing the local id is fine — just add both). A message is "mine" when `mineRef.current.has(message.id)`. No persistence across reloads needed — after a refresh everything renders as "theirs," which is normal guestbook behavior.

- **Their bubble** (default, left-aligned): `max-w-[82%] sm:max-w-[70%]`, `bg-white`, `border border-[#e1e1e1]`, `rounded-2xl rounded-bl-md`, `px-4 py-3`, shadow `shadow-[0_6px_20px_rgba(25,25,25,0.10)]`. Meta line INSIDE the bubble, top: name `text-[13px] font-semibold text-[#191919]` + the existing orange Wifi/MapPin icon (size 11–12) + `·` + relative time `text-[11px] text-[#7b7b7b]`. Message body below: `text-[15px] leading-6 text-[#4a4a4a]`, keep `break-words min-w-0`.
- **My bubble** (right-aligned, `self-end`): same geometry but `rounded-2xl rounded-br-md`, `bg-[#ff5c00] text-white`, no border, shadow `shadow-[0_6px_20px_rgba(255,92,0,0.35)]`. Meta line: name in `text-white font-semibold`, icon and time in `text-white/70`. Body `text-white`.
- **Markdown restyle inside MY bubbles only** (keep all tokenize/linkify/render logic identical): links `text-white underline decoration-white/60 hover:decoration-white`, inline code `bg-white/20 text-white`, blockquote `border-white/50 text-white/80`, code blocks stay `bg-[#191919] text-white` (fine on orange). Their bubbles keep the current link/code styling. Implement by threading a `mine: boolean` through `renderMessageText`/`renderInlineMessageText`/`linkifyMessageText` (default false) — do not fork the functions.
- **Pending**: bubble at `opacity-60`, time slot shows `Sending…` (white/70 in my bubble). **Failed**: full opacity, `Not sent` + Retry + dismiss X exactly as now, restyled for the orange bubble (`text-white`, underline).
- Consecutive messages: no grouping logic needed — every message keeps its own bubble and meta line. Keep it simple.

## Keep untouched

- Realtime subscription, presence count, `mergeMessages`, optimistic send/retry/dismiss flow, geolocation check, name persistence, scroll anchoring, Enter-to-send, 500-char limit, header, both footers, info sheet, all API calls.
- Fonts and theme tokens as they are.
- No new dependencies. Zo file keeps the esm.sh supabase import; Vercel file keeps `@supabase/supabase-js`.

## One copy sync (Vercel file only)

In `src/pages/CorgiGuestbook.tsx`, the locked footer still says `Watching from afar — come by 9 Claude Lane to join.` Replace with the Zo copy: `Watching from afar. Visit Claude Lane or Dogpatch to join.` (no em dash).

## Acceptance checklist

1. Both files parse: `bun build --target=browser --outdir=/tmp/corgi-check routes/guestbook.tsx` and the same for `src/pages/CorgiGuestbook.tsx` (external packages may warn; syntax errors fail).
2. Wallpaper visible in the scroll area with doodles legible through the veil; header/footers stay white.
3. Messages render as individual shadowed bubbles; my sends align right in orange instantly (optimistic), others' arrive left in white.
4. Zero behavior diffs outside `mineRef` bookkeeping and presentation.
5. No `uppercase`, no `tracking-[`, no `font-black`, no em dashes in copy.
