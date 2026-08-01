# Brief: Make the chat a full-viewport room (chat.tsx)

## Goal
The chat section of `Projects/corgi-cafe/routes/chat.tsx` is currently a `max-w-3xl` card with a fixed `h-[430px]` scroll window under the hero. It reads as a boring widget compared to the hero. Rebuild it as a **full-viewport, full-bleed "chat room"** with the same bold editorial art direction as the hero.

Edit ONLY `/home/workspace/Projects/corgi-cafe/routes/chat.tsx`. Do not touch the hero section (the first `<section>`), the API route, or any behavior/logic.

## Hard constraints (do not break)
- All existing state, effects, and functions stay exactly as they are: polling every 2.5s, `loadMessages`, `sendMessage`, `checkLocation`, `joinChat` (which scrolls to `chatRef` + focuses `composerRef`), name persistence in localStorage, `nearBottomRef` auto-scroll logic, Enter-to-send, 500-char limit, disabled states.
- Keep `ref={chatRef}` on the chat section, `ref={listRef}` + the existing `onScroll` handler on the scrollable message list, `ref={composerRef}` on the textarea.
- Keep the gated states: allowed (composer visible) vs not allowed ("I'm at the cafe" location button + locked footer), `reconnecting` indicator, empty state, `via` badges (📶/📍) and `relativeTime` on messages.
- Keep the `theme` object and CSS-variable approach. You may add colors to `theme` if needed.
- lucide-react icons only; Tailwind classes only (no new deps, no external URLs).

## Layout spec
Replace the current chat `<section>` with a section that is:

1. **Full viewport**: `min-h-dvh` and full-bleed width (no max-w card wrapping the whole thing). Structure it as a flex column exactly `h-dvh` tall (use `h-dvh` on the section or an inner wrapper) so it works as a self-contained screen: header row on top, message list as `flex-1 min-h-0 overflow-y-auto`, composer pinned at the bottom. The page then has two screens: hero, then the chat room.
2. **Header strip** (top of the room): dark bar (`#241a12`) with, left: a pulsing live dot + "LIVE FROM THE CAFE" in small black-weight uppercase tracking-wide type; right: the presence status — when allowed, "You're here 🟢"; when not, the "I'm at the cafe" button (keep `checkLocation` wiring). Show `reconnecting…` here when reconnecting. On mobile this can wrap to two rows.
3. **Room background**: the room itself should be saturated Corgi orange (`#ff5c00`) — commit to it, like the hero commits to its photo. Add subtle texture/depth with an oversized, very-low-opacity watermark word (e.g. "WOOF" or "CORGI") in black-weight type behind the messages, clipped, non-interactive (`pointer-events-none select-none`), plus optionally a faint dot grid via a CSS radial-gradient background. No emoji confetti.
4. **Message list**: full-bleed scroll area; inner column `mx-auto w-full max-w-5xl px-5 sm:px-10`. Messages get bigger and more editorial: white bubbles with the existing 2px dark border + hard offset shadow style, `rounded-[1.5rem]`, text at `text-base sm:text-lg`, name row in black-weight. Alternate alignment (every ~3rd message `ml-auto`, keep the existing `index % 3` trick or similar) with `max-w-[85%] sm:max-w-[70%]`. Timestamps/via badge as they are today but restyled to fit.
5. **Empty state**: centered in the room, sized up to feel intentional on a full screen: big 🦴 tile (keep the rotated tile idea), "Quiet in here. Suspiciously quiet." in huge black-weight type (white on orange), sub-line "Be the first to bark from the cafe." Optionally echo the hero's type treatment (e.g. a giant outlined/hollow word).
6. **Composer** (allowed state): pinned to the bottom of the room, full-bleed dark bar (`#241a12`) so it mirrors the header; inner `max-w-5xl` row with the name input, textarea, and send button restyled to sit on dark (white/10 field backgrounds, white text, orange send button). Keep exact input behaviors. The "You're posting live from Corgi Cafe" microcopy can live in this bar.
7. **Locked state** (not allowed): instead of the composer, a bottom bar with "📍 Visit 9 Claude Lane to unlock the chat" styled to match the dark bar.
8. The old "The chat" heading block and the outer card wrapper go away — the room IS the section. Keep the closing tagline line ("Made for neighbors, night owls, and very good dogs") but move it INTO the room (e.g. tiny type in the header or above the composer) or drop it if it fights the layout — your call, note it in the summary.
9. Mobile: everything must work at 390px wide — header wraps, message column `px-4`, composer stacks name above the textarea row if needed. The room must still be exactly one viewport tall with the list scrolling internally.

## Acceptance checks (self-verify before finishing)
- `bun x tsc --noEmit` equivalent isn't set up; instead ensure the file parses: `bunx --bun esbuild --loader:.tsx=tsx --bundle=false < routes/chat.tsx > /dev/null` or a comparable syntax check.
- Grep-verify: `chatRef`, `listRef`, `composerRef`, `onScroll`, `checkLocation`, `sendMessage`, `loadMessages` all still present and wired.
- The hero `<section>` block is byte-identical to before your edit.
- Summarize what you changed and any judgment calls at the end.
