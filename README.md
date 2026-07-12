# Agent Anatomy

![An agent fixes a broken product page while its context window fills with token particles](./docs/media/replay.gif)

Interactive visual explainers for how AI systems actually work — in the tradition
of [Bartosz Ciechanowski](https://ciechanow.ski/) and [The Pudding](https://pudding.cool/).

**Episode 01 — [How an AI agent works](https://wenhaoyu-bryan.github.io/agent-anatomy/episodes/how-an-agent-works/).**
The loop, the context window, and what actually happens when you give an AI a task.
Written for a smart reader with no AI background: you scroll, a glass volume fills
with token particles, and then you watch a real(istic) agent run fix a broken
product page — event by event, with the world healing as it works.

> **Live:** https://wenhaoyu-bryan.github.io/agent-anatomy/

This repo is two products, and both matter:

1. **The essay** — a scroll-driven, WebGL-powered visual page.
2. **The trace format + replay engine** — a typed, documented JSON schema for
   agent execution traces, plus a headless engine that renders *any* conforming
   trace. Write your own trace, get an interactive replay.

## Write your own trace

A trace is one JSON file describing a complete scripted agent run — the same
shape as real agent transcripts (system prompt → user message → thinking →
tool calls → results → answer), so real session logs can be adapted.

```jsonc
{
  "version": "1.0",
  "meta": { "id": "my-run", "title": "…", "description": "…", "contextWindowTokens": 4096 },
  "tools": [{ "name": "edit_file", "description": "Replace a piece of text in a file." }],
  "initialArtifact": { "kind": "webpage", "files": { "page.html": "…" }, "renderId": "before" },
  "events": [
    { "id": "e01", "type": "user_message", "text": "Fix my page?", "tokens": 18 }
    // … thinking, tool_call, tool_result (with artifact snapshots), assistant_message
  ]
}
```

1. Copy [`traces/example-minimal.trace.json`](./traces/example-minimal.trace.json)
2. Script your scenario — 15–25 events; make the artifact visibly change at least once
3. Validate with `pnpm trace:validate` (CI runs it on every push)

Full spec: [`docs/trace-format.md`](./docs/trace-format.md) ·
JSON Schema: [`docs/trace.schema.json`](./docs/trace.schema.json) ·
The engine: [`src/trace/replay.ts`](./src/trace/replay.ts) (pure, zero React imports,
O(1) scrubbing — unit-tested with Vitest).

## Stack

- Vite 6 + TypeScript (strict), React 19
- React Three Fiber + drei + postprocessing — one canvas, two scenes, selective bloom
- GSAP ScrollTrigger + Lenis for scroll orchestration (both disabled under `prefers-reduced-motion`)
- zustand binding the headless replay engine to the UI
- Tailwind v4 with a CSS-custom-property token system ("flight recorder" identity)
- zod → JSON Schema for the trace format

Everything degrades: no WebGL (or reduced motion) gets a 2D context meter and a
fully readable, non-pinned page. The essay text is prerendered into the HTML at
build time — view-source shows the whole story.

## Develop

```sh
pnpm install
pnpm dev             # dev server
pnpm build           # typecheck + build + SSR prerender
pnpm test            # replay engine unit tests
pnpm trace:validate  # validate all traces against the schema
```

Deployed to GitHub Pages via GitHub Actions on push to `main`. Build notes and
decisions live in [`NOTES.md`](./NOTES.md).

## License

MIT — see [LICENSE](./LICENSE). Made by [Wenhao Yu](https://wenhaoyu-bryan.github.io/).
