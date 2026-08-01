You are the implementation agent for the existing HyperFrames project in this directory.

Implement Step 5 only. Build all seven frame sub-compositions listed in STORYBOARD.md at their exact `src:` paths under `compositions/frames/`. The complete worker contracts and per-frame specifications already exist in `.hyperframes/frame-packets/_role.md` and `.hyperframes/frame-packets/01-hook.md` through `07-cta.md`. Read `_role.md` fully, then read each frame packet fully before authoring that frame. Also read `frame.md`, `STORYBOARD.md`, and the project `AGENTS.md`.

Acceptance criteria:

- Produce seven valid, deterministic HyperFrames sub-composition HTML files, one per packet.
- Follow the exact storyboard content, duration, asset roles, handoff states, and motion direction.
- Use local assets only with project-root-relative paths such as `assets/corgichat.webp`.
- Frames 03 and 04 must use the supplied real MP4 footage through the approved frame-video declaration specified by the worker contract. Do not recreate the product UI.
- Use one paused GSAP timeline per composition registered in `window.__timelines` under the exact composition id.
- No network imports, random values, wall-clock APIs, infinite repeats, or audio elements.
- Do not edit STORYBOARD.md, BRIEF.md, frame.md, index.html, package.json, captures, footage, or assets.
- After all seven files exist, run `npm run check` only if the project can validate sub-compositions before assembly. If it cannot because index.html is still the blank scaffold, report that clearly and stop without assembling or modifying index.html.

Return a concise list of created files and any issue that the orchestrator must handle during assembly.
