# Project Brief: Interactive AI Explainer Series — Episode 1: "How an AI Agent Works"

You (Claude Code) are building a new open-source project from scratch. Read this entire brief before writing any code. Where this brief is decisive, follow it exactly. Where it delegates a decision to you, state your choice and reasoning before implementing.

---

## 1. What this project is

A scroll-driven, interactive visual essay that explains how an AI agent actually works — the loop, the context window, tool use — to an audience that includes non-developers. It is episode 1 of a series that will grow, all living in one repo, deployed to GitHub Pages under the owner's existing domain (`wenhaoyu-bryan.github.io/<repo-name>/`).

The project has two products, and both matter equally:

1. **The essay** — a visually exceptional page in the tradition of Bartosz Ciechanowski and The Pudding. This is the portfolio showpiece.
2. **The trace format + replay engine** — a typed, documented JSON schema for agent execution traces, and the engine that renders any conforming trace. This is the starrable open-source artifact. It must be designed as if others will adopt it, because the goal is that they do.

### Success criteria (all four must hold)

- A person with no AI background scrolls the page and can explain afterward what an agent loop and a context window are.
- A developer views the repo and finds a clean, documented trace schema and replay engine worth starring or reusing.
- At least one moment on the page works as a standalone screen recording under 15 seconds that makes people say "what is this?" — this is a hard requirement, design for it explicitly (see §7, the context-window scene).
- Lighthouse: Performance ≥ 85 mobile / ≥ 95 desktop, Accessibility ≥ 95 on the deployed page.

### Explicitly out of scope for v1

- Live LLM calls of any kind. The replay is a scripted trace file.
- The "Where agents go wrong" section — it is episode 1.5, a fast-follow. Leave a structural slot for it but do not build it.
- Episode 2+. The landing page is an episode index with one live episode and greyed "next episode" slots.
- CMS, comments, analytics beyond a simple privacy-friendly counter (optional, e.g., GoatCounter).

---

## 2. Repo naming and setup

Proposed names, in order of preference: `agent-anatomy`, `visible-agents`, `trace-theater`. Before scaffolding:

1. Check each name is free as a GitHub repo under this account and reads well in a URL. Pick the first available; if none, propose two alternatives and pause for approval.
2. Initialize with MIT license, `main` branch, and GitHub Actions deploy to GitHub Pages (build on push to main).
3. The **very first milestone is a walking skeleton**: an empty styled page deployed and reachable at the public URL. Do not build features before deployment works, because GitHub Pages base-path bugs (`/repo-name/` prefix on all assets and routes) are cheapest to fix at hour one.

---

## 3. Tech stack (decisive — do not substitute without flagging)

This deliberately steps beyond the owner's previous Astro + GSAP + SVG stack. The centerpiece is real WebGL.

| Layer | Choice | Notes |
|---|---|---|
| Build | Vite 6+, TypeScript strict | Multi-page setup: `index.html` (series landing) + `episodes/how-an-agent-works/index.html` |
| UI | React 19 | Single React tree per page; no meta-framework needed for a static site this size |
| 3D/WebGL | **React Three Fiber + drei + @react-three/postprocessing** | This is the new-skill centerpiece. Instanced meshes for particles, selective bloom |
| Scroll | GSAP ScrollTrigger + Lenis | Scroll orchestration for narrative sections; pin + scrub for the WebGL scene |
| State | zustand | One store for replay state (current event index, playback status, derived context contents) |
| Styling | Tailwind v4 + CSS custom properties for the token system | Design tokens defined once in §6 |
| Trace schema | Plain TypeScript types + JSON Schema (generated via `zod` → `zod-to-json-schema`) | zod validates trace files at build time and in tests |
| Testing | Vitest for the replay engine (headless); Playwright optional for one smoke test | The engine must be testable with no DOM |
| Fonts | Self-hosted via `@fontsource` — no external font CDN | Choices in §6 |

Dependency discipline: no component libraries, no animation kitchen sinks beyond GSAP, no icon packs (inline SVG only). Total JS budget for the episode page: **< 450 KB gzipped including three.js**. If a dependency threatens the budget, flag it.

---

## 4. The trace format (build this first, before any UI)

This is the heart of the project. It must mimic the *shape* of real agent transcripts so that real Claude Code session logs can be adapted into traces later.

### 4.1 Schema (TypeScript, enforced with zod)

```ts
/** A complete scripted agent run. One file per scenario. */
export interface Trace {
  version: "1.0";
  meta: {
    id: string;
    title: string;
    description: string;
    /** Rough model of context budget, for the token meter. */
    contextWindowTokens: number;
  };
  /** Tools available to the agent in this run — rendered in the "toolbox" panel. */
  tools: ToolDef[];
  /** Initial state of the world the agent acts on (see §4.2). */
  initialArtifact: ArtifactState;
  events: TraceEvent[];
}

export interface ToolDef {
  name: string;           // e.g. "read_file", "edit_file", "render_page"
  description: string;    // one plain-English line
}

export type TraceEvent =
  | { id: string; type: "system_prompt"; summary: string; tokens: number }
  | { id: string; type: "user_message"; text: string; tokens: number }
  | { id: string; type: "thinking"; text: string; tokens: number }
  | { id: string; type: "tool_call"; tool: string; input: Record<string, unknown>; tokens: number }
  | { id: string; type: "tool_result"; tool: string; output: string; tokens: number;
      /** If this event changes the world, the new full state. */
      artifact?: ArtifactState }
  | { id: string; type: "assistant_message"; text: string; tokens: number };
```

Rules: every event carries a `tokens` estimate (hand-tuned, plausible; does not need to be exact). The engine derives cumulative context usage by folding over events. `tool_result.artifact` is a full snapshot, not a diff — snapshots keep the engine trivial and scrubbing instant.

### 4.2 ArtifactState — the visible world

For episode 1 the artifact is a tiny fake webpage the agent is fixing:

```ts
export interface ArtifactState {
  kind: "webpage";
  files: Record<string, string>;       // path -> file contents (2–3 small files max)
  /** Pre-rendered visual state keyed by snapshot id — what the "browser" panel shows.
      Implement as a React component switch, not screenshots. */
  renderId: string;
}
```

### 4.3 The scenario (decisive)

**"Fix the broken product page."** A one-page mini store sells a single product — a mechanical keyboard. Two visible bugs: the product image is broken (missing-image icon) and the price renders as `$NaN`. The user asks the agent: *"My product page is broken — the picture won't load and the price looks wrong. Can you fix it?"*

Beat sheet for the trace (~18–24 events):
1. `system_prompt` (summary: "You are a coding agent. You can read files, edit files, and re-render the page.") 
2. `user_message` — the ask above.
3. `thinking` — plan: look at the page files first.
4. `tool_call read_file page.html` → `tool_result` (context grows noticeably here).
5. `thinking` — spots `<img src="keybord.jpg">` typo hypothesis, needs to check the images folder.
6. `tool_call list_files images/` → result shows `keyboard.jpg`.
7. `tool_call edit_file` fixing the src → `tool_result` with new artifact snapshot → **browser panel: image appears**.
8. `tool_call read_file price.js` → result reveals `price = base + tax` where `tax` is undefined.
9. `thinking` — explains NaN in one plain sentence (this is the teaching moment; write it for a non-developer).
10. `edit_file` fix → new snapshot → **price renders $149**.
11. `tool_call render_page` final check → `assistant_message` summarizing what it did and why.

Why this scenario: a non-developer can *see* the world change (image pops in, NaN becomes a price). Seeing the artifact heal is the emotional payoff; a green test checkmark is not.

### 4.4 Replay engine

Pure, headless module: `createReplay(trace)` returning `{ stateAt(index), next(), prev(), seek(i), play(speedMs), pause() }` where `stateAt` yields `{ event, contextItems, tokensUsed, artifact }`. Fully unit-tested (token accumulation, artifact snapshot resolution, bounds). Zero React imports — React binds to it via zustand.

---

## 5. Page structure — the episode (5 sections, no more)

Narrative sections are DOM/GSAP. The WebGL canvas mounts once and is shown/pinned only where specified. Every section has a `prefers-reduced-motion` variant (final-state static layout) and real HTML text content (no text baked into canvas) so the page is indexable and accessible.

### S1 — Hero
Full viewport. Title: **"What happens when you give an AI a task?"** Subline: "A visual guide to how AI agents actually work. No background needed." A restrained ambient WebGL background (see §7, Scene A — keep it quiet; the hero's job is the question, not fireworks). Scroll cue. Episode eyebrow: "Episode 01".

### S2 — The Loop
The naive mental model ("prompt in → answer out") drawn as one arrow, then scroll dissolves it into the real shape: **think → act → observe → repeat**, an animated cycle diagram (SVG + GSAP is correct here — don't use WebGL for diagrams). This loop motif becomes the page's recurring visual signature: it reappears as a tiny live state indicator during the replay (S4), showing which phase the agent is in at every step.

### S3 — The Context Window
The centerpiece concept and the **shareable-clip scene** (§7, Scene B). Pinned section, scroll-scrubbed: an empty glass container labeled with the token budget fills as things enter — system prompt, the user's request, file contents, tool results — each as a stream of particles in its category color, with a live token meter. Copy teaches: the model doesn't "remember" — everything it knows right now must fit in this window, and every tool result spends budget. End state: window comfortably part-full, one line foreshadowing overflow ("what happens when it fills up? That's episode 1.5").

### S4 — The Replay (the showpiece)
Pinned, interactive, **user-driven** (buttons + timeline scrubber + optional autoplay; do not tie replay progress to scroll — scroll-scrubbed steppers frustrate on mobile and break the share clip). Layout, desktop:

```
+----------------------------------------------------------+
| timeline: ●──●──●──●──●──○──○  [⏮ ◀ ▶ ⏭] [autoplay ▷]      |
+------------------+--------------------+------------------+
| TRANSCRIPT       |  CONTEXT WINDOW    |  THE PAGE         |
| (event stream:   |  (same particle    |  (rendered fake   |
| msgs, thinking,  |   container from   |   product page,   |
| tool calls —     |   S3, now live-    |   heals as the    |
| current event    |   fed by replay)   |   agent works)    |
| highlighted)     |  + loop indicator  |                   |
+------------------+--------------------+------------------+
```
Mobile: tabbed panels (Transcript / Context / Page) with the timeline persistent. The S3 → S4 continuity — the same container the reader just learned about, now driven by a real(istic) run — is the intellectual payoff of the page. 

### S5 — Close / Series index
What you now understand (three one-liners). "Episode 1.5: Where agents go wrong — coming next" slot. GitHub link with a line inviting people to write their own trace files ("the replay engine renders any trace that fits the schema — here's the spec"). Quiet "made by Wenhao Yu" credit linking to the portfolio. Landing page (`index.html`) mirrors this: series title, episode card for 01, dimmed slots for what's next.

---

## 6. Visual identity (decisive direction; refine details, don't replace)

**Anti-default warning:** do NOT ship the generic "near-black background + one electric accent" look, and do not use warm-cream/terracotta editorial (that's the Manifesto's identity — this project must be visibly distinct from it).

**Direction: flight recorder / mission control telemetry.** The subject is *observing a machine think*, so borrow from instruments that observe machines: flight data recorders, oscilloscopes, phosphor terminals, air-traffic strips. Precision, calm, quietly technical — not hacker-movie neon.

Tokens (starting point — tune, but keep the temperament):

- Palette: deep blue-black canvas `#0B0E14`; panel `#121826`; hairlines `#243043`; primary text `#E6EDF3`; muted `#8B98A9`. Telemetry category colors (particles, event types): phosphor amber `#FFB454` (thinking), signal cyan `#5CCFE6` (tool calls/results), soft green `#87D96C` (artifact healed / success), magenta-coral `#F07178` (user messages). Never more than one saturated color dominant per view.
- Type: a characterful display face for section titles used sparingly (pick something with technical personality — e.g., Space Grotesk or Instrument Sans; your call, justify it); IBM Plex Sans or Inter for body; **IBM Plex Mono for all trace/telemetry text** — transcript, tokens, timeline labels. The mono voice is part of the identity.
- Texture: subtle 1px grid or scanline in panels at ≤ 3% opacity; hairline borders, small caps micro-labels ("CTX 4,096 / 128,000", "EVT 07/22"). No glassmorphism, no glow abuse — bloom lives in the WebGL scene only.
- Motion: mechanical easing (expo/quart out), 200–400ms UI transitions; particles are the only "organic" motion on the page.

---

## 7. WebGL scenes (R3F)

One `<Canvas>` instance, scenes swapped by visibility to keep GPU cost sane.

**Scene A — Hero ambient.** A sparse field of slow-drifting particles with faint connecting lines that occasionally pulse along the loop motif shape. Quiet. < 1,500 particles. Must idle at 60fps on a mid-range laptop and degrade to a static gradient on `prefers-reduced-motion` or WebGL failure.

**Scene B — The Context Window (S3 + S4).** The signature. A translucent bounded volume (box or cylinder, hairline edges); tokens are instanced particles that stream in along bezier paths from labeled sources, then settle into loosely packed layers by category color. Selective bloom on newly arrived particles, fading as they settle. Token meter is DOM, synced via zustand. In S3 it's scroll-scrubbed (seeded demo data); in S4 the same scene is driven by replay events — each event emits its `tokens` worth of particles in its category color. Cap total instances (~8–10k) and recycle. **This scene, autoplaying through the replay, is the 15-second share clip — compose it (camera, framing, pacing) so a straight screen recording needs no editing.**

Fallbacks: feature-detect WebGL; on failure or reduced motion, render a clean 2D stacked-bar context meter (DOM) with the same colors — the page must remain fully comprehensible without WebGL.

---

## 8. Accessibility, performance, SEO

- All narrative copy is HTML; canvas is `aria-hidden` decoration with the information duplicated in DOM (the token meter, transcript, and page panel are all DOM).
- Full keyboard support for the replay: timeline is a slider (arrow keys step events), buttons focusable, visible focus rings.
- `prefers-reduced-motion`: no scroll-jacking, no autoplay, static scene variants; Lenis disabled.
- Static, indexable content: prerender or ensure meaningful HTML without JS (Vite + `vite-plugin-ssr`-style prerendering, or a minimal build-time HTML snapshot — your call; the requirement is that view-source shows the essay text). Meta/OG complete, custom OG image per page, `llms.txt` at the repo site root describing the project (the owner cares about GEO).
- Perf: lazy-mount the canvas below the fold, `IntersectionObserver` to pause offscreen scenes, compressed fonts subset to used glyphs, image assets in AVIF/WebP.

---

## 9. Open-source packaging

- `README.md`: hero GIF (the share clip), one-paragraph pitch, live link, "write your own trace" quickstart, schema link, stack notes, credits.
- `docs/trace-format.md`: full schema documentation with the JSON Schema file checked in, plus a minimal example trace.
- `traces/` directory: `fix-broken-page.trace.json` (episode 1) + `example-minimal.trace.json`.
- CI validates all trace files against the schema on every push.
- MIT license, `CONTRIBUTING.md` (short: how to add a trace, how to propose an episode), issue templates optional.

---

## 10. Execution milestones (work in this order; stop and show after each)

- **M0 — Walking skeleton.** Repo, Vite multi-page scaffold, Tailwind tokens, fonts, GitHub Actions → Pages deploy, base-path verified on the live URL. *Demo: empty styled hero live on the internet.*
- **M1 — Trace core.** zod schema, JSON Schema export, `fix-broken-page.trace.json` fully written (all beats from §4.3, copy included), headless replay engine + unit tests, CI validation. *Demo: tests green, trace validated.*
- **M2 — Replay UI (DOM only).** S4 three-panel layout with a temporary 2D bar as the context meter; timeline, controls, keyboard support, mobile tabs; fake product page component with per-snapshot renders. *Demo: full replay usable end to end with no WebGL.*
- **M3 — WebGL.** Scene B replacing the 2D meter, wired to both scroll (S3) and replay (S4); Scene A hero; fallbacks. *Demo: the share clip is recordable.*
- **M4 — Narrative.** S1, S2, S5 built; all copy written (plain, precise, second person, no hype — write for the smart non-developer); scroll orchestration; landing/index page.
- **M5 — Polish & ship.** Reduced-motion pass, Lighthouse pass against §1 budgets, cross-browser (Safari especially, for Lenis + bloom), OG images, README with GIF, llms.txt. *Demo: launch-ready URL.*

After M5, produce a short launch kit in `docs/launch.md`: suggested X thread (3 posts, clip-first), Show HN title + first comment draft, and a 200-word blurb for the owner's portfolio Featured Projects entry.

## 11. Working rules for this build

- After each milestone, stop, summarize what exists, and show how to verify it. Do not run ahead.
- When a decision in this brief conflicts with reality (a library version issue, a perf wall), state the conflict and your proposed substitution before switching.
- Keep a `NOTES.md` scratchpad of decisions made and things tried — it becomes material for the owner's write-up post later.
- Copy quality bar: every sentence on the page should survive being read aloud. No filler like "in today's fast-moving AI landscape."
