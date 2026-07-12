# Agent Anatomy

Interactive visual explainers for how AI systems actually work — in the tradition
of [Bartosz Ciechanowski](https://ciechanow.ski/) and [The Pudding](https://pudding.cool/).

**Episode 01 — How an AI agent works.** The loop, the context window, and what
actually happens when you give an AI a task. Built for an audience that includes
non-developers.

> **Live:** https://wenhaoyu-bryan.github.io/agent-anatomy/ · _(walking skeleton — M0)_

This repo has two products, and both matter:

1. **The essay** — a scroll-driven, WebGL-powered visual page. The portfolio showpiece.
2. **The trace format + replay engine** — a typed, documented JSON schema for agent
   execution traces, plus an engine that renders any conforming trace. The reusable
   open-source artifact — write your own trace, get an interactive replay.

## Stack

- Vite 6 + TypeScript (strict), React 19
- React Three Fiber for the WebGL context-window scene _(added at M3)_
- GSAP ScrollTrigger + Lenis for scroll orchestration _(added at M4)_
- zustand for replay state
- Tailwind v4 with a CSS-custom-property token system
- zod → JSON Schema for the trace format; Vitest for the headless replay engine

## Develop

```sh
pnpm install
pnpm dev        # dev server
pnpm build      # typecheck + static build
pnpm test       # replay engine unit tests
```

Deployed to GitHub Pages via GitHub Actions on push to `main`.

## Build status

Built in milestones (see `NOTES.md`). Currently at **M0 — walking skeleton**:
styled landing + episode hero, deployed live, base path verified.

## License

MIT — see [LICENSE](./LICENSE). Made by Wenhao Yu.
