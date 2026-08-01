# Resume the Corgi Chat video locally

## Current state

The active composition is `index.html`, currently 15.9 seconds. It uses:

- `assets/clip-landing.mp4`
- `assets/clip-guestbook.mp4`
- the sound effects under `assets/sfx/`

The next edit should:

1. Shorten the inactive landing-page hold.
2. Never show the guestbook loading state.
3. Add two restrained text beats: “Chat with other coworkers” and “Only at Corgi Cafe.”
4. Show the location gate as an on-camera interaction.
5. Keep the product demo large and readable, with camera movement following the interaction.

The prior gate recording attempt was unsuccessful and was not added to the project. Record a fresh gate clip locally.

## Requirements

- Node.js 22 or newer
- FFmpeg
- Chrome or Chromium

## Start

```bash
cd corgi-chat-launch
npm run dev
```

Leave that terminal running and open the URL printed by HyperFrames.

## Agent prompt

Use this prompt with Codex or Claude Code from the project directory:

> Resume this existing HyperFrames product-demo project. Read `AGENTS.md`, `BRIEF.md`, `STORYBOARD.md`, and the current `index.html` before editing. The active cut is 15.9 seconds. Tighten the landing hold, remove every loading-state frame, add only two brief text beats (“Chat with other coworkers” and “Only at Corgi Cafe”), and record/show the location gate as an on-camera interaction. Keep the website footage full-frame and dynamically punch in so the composer, typed message, Send action, and resulting ledger entry are easy to read. Preserve the Corgi visual language. Use the relevant HyperFrames skills before modifying the composition. Run `npm run check`, inspect snapshots around every cut and interaction, then render a draft for review. Do not render high quality until I approve the draft.

## Validate and render

```bash
npm run check
npx hyperframes@0.7.87 snapshot --at 1,3,5,7,9,11,13,15
npx hyperframes@0.7.87 render --quality draft --output renders/corgi-chat-product-demo-draft.mp4
```

After approving the draft:

```bash
npx hyperframes@0.7.87 render --quality high --output renders/corgi-chat-product-demo-final.mp4
ffprobe -v error -show_streams -show_format renders/corgi-chat-product-demo-final.mp4
```

The scripts intentionally pin HyperFrames 0.7.87 for reproducibility. Keep that version for this edit unless you explicitly want to upgrade and revalidate the project.
