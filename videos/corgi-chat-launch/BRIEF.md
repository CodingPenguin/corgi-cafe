---
workflow: product-launch-video
flow: automation
storyboard: no
message: "A live guestbook you can only sign from the cafe"
destination: x-feed
aspect: 1920x1080
language: en
audience: "Corgi Cafe regulars and the terminally online friends they share it with"
length: 45s
angle: presence
---

## Intent

Launch video for Corgi Chat (https://danmaruchi.zo.space/corgi) — a realtime
guestbook for Corgi Cafe at 9 Claude Lane. The hook is the gate: anyone can
watch the wall from anywhere, but you can only post while physically at the
cafe. Tone: playful, confident, a little cheeky — buzz-app energy, not SaaS
earnestness. The video should feel like the product: loud orange poster hero
outside, calm corgi.insure-style room inside.

## Assets

- ../../assets/ — flying-corgi hero art (original PNG + optimized WebP served
  at /assets/corgi-hero.webp on the Space); the landing page's signature image.
- Screen recording (to be captured in Step 1) — real footage of the live
  guestbook: typing a message, optimistic send, message landing via WebSocket.
  Feature real captured screens; do not rebuild the site from scratch.

## Customizations

- Feature a real screen recording of the site as the centerpiece footage —
  the user explicitly asked for "hyperframes + a screen recording".
- Follow the product's own design language: corgi.insure calm (light #f6f6f6,
  Geist, sentence case, hairline #e1e1e1 borders, 12px radius, orange #ff5c00
  accents, 3D push buttons on a #cc4a00 base) for UI moments; the bold
  orange/black poster language for title beats. Tokens in
  ../../GUESTBOOK-CALM-BRIEF.md.

## Notes

- Presence gate is currently disabled for testing (GATE_DISABLED) — the video
  should still sell the gated story ("be there to post, watch from anywhere").
- Messages expire after 24h; "new day, new wall" is fair game as a beat.
- Not signed in to HeyGen; local engines only. No narration required — type
  and motion can carry it; BGM optional if a local engine is available.
- Sweet spot 30–60s; keep it tight.
