# Brief: De-emoji the UI + inline markdown in messages (chat.tsx)

Edit ONLY `/home/workspace/Projects/corgi-cafe/routes/chat.tsx`. Do not touch the hero section (first `<section>`) except where noted, the API, or any state/effects/handlers.

## Part 1 — Header cleanup + replace ALL UI emoji with lucide icons

User feedback: the header tagline feels AI-coded and offbrand; emoji-as-icons is an antipattern. Changes:

1. **Delete the tagline** `Made for neighbors, night owls, and very good dogs` from the chat header entirely. Do not relocate it.
2. **"You're here 🟢"** → drop the emoji. Render as: a small green status dot (a `span` with `size-2 rounded-full bg-emerald-400` plus a subtle `animate-pulse` or static glow) followed by "You're here" in the existing black-weight style. Dot before text, matching the header's left-side live-dot pattern.
3. **Message name prefix `🐾`** → `PawPrint` lucide icon, small (size 14-16), inline before the name, colored `var(--corgi-accent)`.
4. **Via badges `📶` / `📍`** on messages → `Wifi` / `MapPin` lucide icons at size 12-13, inline, muted color, keeping the relative time next to them.
5. **Empty state `🦴` tile** → `Bone` lucide icon (size ~40-48) in the same white rotated tile, colored `var(--corgi-accent)`.
6. **Locked bottom bar `📍`** → `MapPin` lucide icon inline before "Visit", size ~16.
7. Update the lucide-react import line accordingly (add PawPrint, Wifi, Bone; MapPin already imported). Remove now-unused icons if any.
8. Do NOT touch emoji that users type inside message text — only UI chrome.

## Part 2 — Inline markdown in message rendering

Extend the existing `renderMessageText` so chat messages support standard texting-app formatting. Requirements:

- Supported syntax: `**bold**`, `*italic*` and `_italic_`, `~~strikethrough~~`, `` `inline code` ``. Newlines already work via `whitespace-pre-wrap`.
- Keep the existing URL auto-linking (URL_PATTERN + anchor styling) working INSIDE plain segments, but NEVER linkify or format inside `inline code` spans (code is literal).
- Do NOT support masked links `[text](url)` — display text must equal the real URL so links can't be spoofed. Note: strip nothing; if someone types `[text](url)` it just renders literally (the url part may still autolink, fine).
- Formatting can be non-nested (bold inside italic etc. not required). Unclosed markers render literally (e.g. a lone `*` or `**foo` stays as typed). No crashes on adversarial input like `****`, "`` ` ``", `**~~*`.
- Implementation: pure function(s), no new dependencies. Suggested approach: first split on code spans, then within non-code segments apply bold/strike/italic via regex token pass, then linkify remaining plain text. Return React nodes with stable keys.
- Styling: bold `font-bold text-[#241a12]`; italic `italic`; strike `line-through opacity-70`; code `rounded bg-[#241a12]/8 px-1.5 py-0.5 font-mono text-[0.9em] text-[#241a12]` (a subtle chip on the white bubble).
- Max message length stays 500; renderer must be O(n) practical for that.

## Acceptance checks (self-verify)
- Syntax check the file parses as TSX (esbuild loader check like before).
- Grep: no `🦴|🐾|📶|📍|🟢` remain in the file; `PawPrint`, `Bone`, `Wifi` imported and used; tagline string gone.
- Unit-style check: write a tiny throwaway script that imports/evals the markdown tokenizer logic if extractable, or at minimum manually trace these cases in the summary: `**bold**`, `*it*`, `_it_`, `~~x~~`, `` `code **not bold** x.com` `` (no formatting/link inside), `hello x.com/path!`, `**unclosed`, `****`.
- Hero section byte-identical except nothing (no hero changes at all).
- End with a summary of changes and judgment calls.
