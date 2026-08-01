---
format: 1920x1080
duration: 40s
message: "A live guestbook you can only sign from the cafe"
arc: Demo Loop — question → product intro → demo 1 → demo 2 → mechanism → twist → CTA
audience: Corgi Cafe regulars and the terminally online friends they share it with
mode: autonomous
music: playful upbeat indie, light percussion, cafe warmth
---

## Video direction

- **Palette system** (from frame.md): ink `#241A12` for type fields and dark
  frames; white/cream canvas for demo stages; accent `#FF5C00` reserved for
  the payoff word, badges, and the CTA — never as body text. Display and body
  are Geist by role; mono chrome for addresses/URLs.
- **Motion grammar**: smooth long-tail settles (`power3` default) everywhere;
  no bouncy/overshoot except the two explicitly playful pops (Frame 5 badge,
  Frame 7 paw). This video has no narration — the reveal cue is the on-screen
  type itself and the footage's own action beats: each `onscreen` phrase is a
  spoken-cue equivalent and nothing enters before its cue. Sequential reveals
  land in the back ~50% of every frame.
- **Rhythm / held frames**: Frames 2 and 7 are the deliberate held reads
  (title card and lockup); Frame 4 is the long money shot — the footage does
  the moving, the stage stays still. Holds live with at most subtle jitter.
- **Negative list**: no slideshow front-loading, no breathing/idle drift, no
  bouncy defaults, no purple-AI gradients or bokeh, no emoji clip-art, no
  real browser chrome or scrollbars — the demo window is a clean hairline
  card, intentionally chrome-less. Footage is never rebuilt as fake UI.
- Caption band: bottom ~17% stays clear on every frame (no captions planned,
  but chips and lockups respect the band).

## Frame 1 — Hook

- src: compositions/frames/01-hook.html
- type: hook
- blueprint: kinetic-type-beats (Reproduce)
- scene: Bold type swaps its key word — every chat is everywhere; this one has an address
- duration: 5s
- transition_in: cut
- status: animated
- onscreen: "every chat is everywhere. / this one has an address."
- asset_candidates: none
- focal: the type itself
- sfx: riser, impact-bass-1

Cold open, ink-black field, giant Geist type. The swap is the joke
and the thesis. No logo yet.

Scene 1 (0.0–1.6s): ink field; "every chat is everywhere." enters via
per-word staggered reveal (`dynamic-content-sequencing`) on power3
settles — centered, ~60% width, single depth layer plus a faint
oversized paw-print watermark in ink-on-ink for depth. Holds a beat.
Scene 2 (1.6–3.0s): the signature move — "everywhere." hard-cut
word-swaps (`discrete-text-sequence`) to "an address." in accent
orange while the rest of the line stays pinned; one soft impact.
Scene 3 (3.0–5.0s): a marker underline draws beneath "address"
(`css-marker-patterns`); then the frame holds still — subtle jitter
only (`sine-wave-loop`, low amplitude).

## Frame 2 — Product intro

- src: compositions/frames/02-product-intro.html
- type: product_intro
- blueprint: titlecard-reveal (Adapt)
- scene: Corgi Chat title card with the flying-corgi hero art and the address line
- duration: 5s
- transition_in: cut
- status: animated
- onscreen: "CORGI CHAT. / live from 9 Claude Lane, San Francisco"
- asset_candidates: corgichat.webp; favicon.svg
- focal: corgichat.webp
- roles: corgichat.webp = background (full-bleed, warm orange gradient overlay left ~55% for type legibility) · favicon.svg = supporting (small paw chip by the address)
- sfx: whoosh-short, impact-bass-2

Adapt: keep the signature ONE restrained reveal + still hold; the
"card" is the full-bleed hero art instead of a small centered card,
mirroring the real landing page.

Scene 1 (0.0–1.2s): the flying-corgi art reveals full-bleed via a
single slide-up crossfade (the blueprint's signature move) with the
orange gradient already in place — asymmetric 60/40, art weighted
right, 3 depth layers (gradient, art, type plane).
Scene 2 (1.2–2.8s): "CORGI CHAT." lands in the left column via
per-word staggered reveal (`dynamic-content-sequencing`), display
role at poster scale, power3 — no overshoot.
Scene 3 (2.8–5.0s): the mono address line "live from 9 Claude Lane,
San Francisco" types on with a caret (`discrete-text-sequence` +
`context-sensitive-cursor`), paw chip fades in beside it; then the
frame holds still for the read.

## Frame 3 — Demo: the site

- src: compositions/frames/03-demo-site.html
- type: feature_showcase
- blueprint: device-surface-showcase (Adapt)
- scene: Real screen recording — landing poster, then Join the chat click-through
- duration: 7s
- transition_in: wipe
- status: animated
- onscreen: "anyone can watch"
- asset_candidates: clip-landing.mp4
- focal: clip-landing.mp4
- roles: clip-landing.mp4 = hero surface inside the floating window
- sfx: whoosh, click
- handoff_out: demo window — centered at 50% x / 46% y, scale 1.0, opacity 1, static (no motion) at the cut

Adapt: keep the signature device-held-as-hero while its screen runs a
real flow; the device is a chrome-less hairline card (12px radius,
soft shadow) on cream, not a phone mockup. The footage plays from 0s
— poster hold, then the "Join the chat" click carries into the
guestbook (~5.5s into the clip).

Scene 1 (0.0–1.0s): cream canvas; the demo window enters via
spring-pop entrance (`spring-pop-entrance`, smooth settle register)
to center, occupying ~72% width in the top 83% — layered depth from
shadow + canvas grain.
Scene 2 (1.0–5.0s): the footage runs — the orange poster reads, and
a slow push (`multi-phase-camera`, single phase, ends before the
back half) commits the eye to the window. Nothing else enters.
Scene 3 (5.0–7.0s): timed to the click-through landing in the
guestbook, the caption chip "anyone can watch" spring-pops
(`spring-pop-entrance`) at the window's lower-left edge, above the
caption band; frame then holds still to the cut.

## Frame 4 — Demo: posting live

- src: compositions/frames/04-demo-posting.html
- type: feature_showcase
- blueprint: device-surface-showcase (Adapt)
- scene: Real screen recording — typing a note, send, and a second message arriving live
- duration: 10s
- transition_in: cut
- status: animated
- onscreen: "posting unlocks in person" then "…and lands instantly"
- asset_candidates: clip-guestbook.mp4
- focal: clip-guestbook.mp4
- roles: clip-guestbook.mp4 = hero surface inside the same floating window
- sfx: typing, pop, notification
- handoff_in: demo window — centered at 50% x / 46% y, scale 1.0, opacity 1, static (no motion) at the cut

Adapt: same stage as Frame 3 so the cut is seamless (matching
handoff). Footage is trimmed to start ~3.2s in (skipping idle) and
plays a 10s window: name + message typing (~3.2–10.2s), send and
optimistic append (~10.9s), maya's WebSocket arrival (~13.4s).

Scene 1 (0.0–4.5s): the window continues exactly where Frame 3 left
it; the footage types the name and note. The chip "posting unlocks
in person" swaps in at the same lower-left anchor via velocity-matched
waterfall cut (`cut-catalog.md`) as typing begins. A gentle
zoom-to-target (`coordinate-target-zoom`) eases toward the composer
region and locks — completed before the midpoint, no back-half push.
Scene 2 (4.5–7.5s): the send fires — the message appears instantly
in the ledger; a cursor click ripple is already in the footage, so
the stage stays still and lets the product act.
Scene 3 (7.5–10.0s): maya's reply lands live on camera; on that
arrival the chip swaps by waterfall cut to "…and lands instantly"
with a keyword glow (`asr-keyword-glow`) on "instantly"; hold to the
wipe, still.

## Frame 5 — The rule

- src: compositions/frames/05-the-rule.html
- type: benefit_highlight
- blueprint: comparison-split (Reproduce)
- scene: Two mirrored cards — read from anywhere / post from the cafe
- duration: 5s
- transition_in: wipe
- status: animated
- onscreen: "read it from anywhere / sign it from the cafe"
- asset_candidates: favicon.svg
- focal: the two cards
- roles: favicon.svg = supporting (pin motif on the orange card)
- sfx: whoosh-short, pop

Scene 1 (0.0–1.4s): cream field; left card "read it from anywhere"
(ink on white, globe-ring motif) enters from the left wing with the
signature mirrored 3D book-open tilt (`split-tilt-cards`), power3.
Scene 2 (1.4–2.8s): right card "sign it from the cafe" (white on
accent orange, paw pin motif) mirrors in from the right wing —
split-screen, equal weight, 3 depth layers.
Scene 3 (2.8–5.0s): the signature inner-edge badge spring-pops
(`spring-pop-entrance`, playful register — sanctioned overshoot):
"no accounts. no feed. just here." on an ink pill at the seam;
then still.

## Frame 6 — The twist

- src: compositions/frames/06-the-twist.html
- type: benefit_highlight
- blueprint: kinetic-type-beats (Reproduce)
- scene: Type beat — the wall resets every 24 hours
- duration: 4s
- transition_in: cut
- status: animated
- onscreen: "new day. new wall. / say it while you're here."
- asset_candidates: none
- focal: the type itself
- sfx: impact-bass-1, riser

Scene 1 (0.0–1.8s): ink field returns; "new day." then "new wall."
slam in as two percussive beats (`kinetic-beat-slam`) — centered
stack, ~55% width, the faint paw watermark recurs for continuity.
Scene 2 (1.8–3.2s): "say it while you're here." reveals per-word
(`dynamic-content-sequencing`) beneath in accent orange — the
back-half reveal, nothing before its cue.
Scene 3 (3.2–4.0s): held read, subtle jitter only.

## Frame 7 — CTA

- src: compositions/frames/07-cta.html
- type: cta
- blueprint: logo-assemble-lockup (Adapt)
- scene: Brand lockup with URL and address, corgi art returns
- duration: 5s
- transition_in: crossfade
- status: animated
- onscreen: "danmaruchi.zo.space/corgi / Corgi Cafe · 9 Claude Lane"
- asset_candidates: corgichat.webp; favicon.svg
- focal: the lockup (type + URL pill)
- roles: corgichat.webp = cutout (the corgi flies in as foreground subject, right third) · favicon.svg = supporting (paw stamp, SVG self-draw finale)
- sfx: whoosh-cinematic, pop, sparkle

Adapt: keep the signature mark-comes-to-exist → centered lockup →
URL/CTA extension; the mark is built from the wordmark cascade plus
the corgi art arriving, not an abstract logo build.

Scene 1 (0.0–1.4s): accent-orange field; the corgi art flies in from
frame-left with a motion-blur streak (`motion-blur-streak`) and
settles right-of-center on power3.
Scene 2 (1.4–3.0s): "CORGI CHAT." letters cascade into the lockup
(`dynamic-content-sequencing`) left-of-center — asymmetric 60/40,
type dominant by 3:1 size.
Scene 3 (3.0–5.0s): the URL "danmaruchi.zo.space/corgi" spring-pops
on a cream pill beneath (smooth settle), the mono address line fades
under it, and the paw favicon self-draws (`svg-path-draw`) as the
final stamp — playful pop sanctioned; then the frame holds to black.
