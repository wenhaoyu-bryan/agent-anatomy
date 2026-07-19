# Agent Anatomy — Project Overview

An end-of-build review of Agent Anatomy at the close of season one (four episodes,
schema 1.3), written on 2026-07-19 for two readers: the owner deciding what comes
next, and a stranger evaluating the project cold. It records what exists, the
measured numbers, a consistency audit, the known debt, launch readiness, and the
raw decision history. It fixes nothing — it describes.

Live: https://wenhaoyu-bryan.github.io/agent-anatomy/ ·
Repo: https://github.com/wenhaoyu-bryan/agent-anatomy

---

## 1. What exists

### The four episodes

**Episode 01 — "How an AI agent works."** The foundation. It answers "what happens
when you give an AI a task?" for a non-developer: the agent loop (think → act →
observe → repeat) drawn as a diagram that then comes alive, the context window as a
finite token budget, and tool use. **Showpiece scene:** S3, a translucent WebGL
volume that fills with token particles in category colours as things enter the
window, continued into S4 where the same volume is driven live by a scripted
replay. **Share clip:** S3 → S4 on desktop — scroll through the filling window, then
play the replay to the moment the broken product image heals (EVT 11).

**Episode 1.5 — "Where agents go wrong."** The darker companion (a "fast-follow",
not a full episode). Three failure vignettes, each a scrubbable replay: the loop
trap (retries the same broken fix forever), context overflow (answers a question
that has evicted out of the window), and a bad observation the agent *catches* by
verifying instead of trusting a stale cache. **Showpiece scene:** F2, a WebGL
particle window that fills to the brim and then drops its oldest tokens — including
the original request — out the bottom. **Share clip:** F2 — the fill topping out,
the oldest band sinking away, and the confidently-wrong answer landing (~12–15s).

**Episode 02 — "How AI reads the web."** Retrieval. An agent that doesn't know the
answer ("is it safe to reheat rice?") searches, weighs results, reads the
trustworthy pages, hits one it *can't* read (a JS-only shell), and writes an answer
with citations threaded back to its sources. **Showpiece scenes:** S3, a pinned
WebGL "funnel" narrowing the whole web to a few fragments; and S5, where the answer
assembles and SVG citation threads draw from each cited span back to its source
chip. **Share clip:** S5 — source chips lighting as they're read (one struck through
✕), then the answer writing in with citation threads reaching back (~14s).

**Episode 03 — "How agents remember"** (season finale). The resolution of 1.5's open
wound. It separates *context* (what's in the window now, wiped at session end) from
*memory* (what's written to a file and survives). One task — planning a 3-day Tokyo
trip — crosses two sessions: the window fills, the agent compacts what it learned
into a smaller lossy summary, writes durable notes, the session ends and the window
empties, and the next day in a blank window it reads the notes back and finishes.
**Showpiece scene:** S3, a pinned, scroll-scrubbed WebGL scene where a crowded
colourful window collapses into one small dim grey summary block (`CTX 2,225 →
925`). **Share clip:** S3 — the fill, hold, draw-down, flare, and collapse to the
grey block (~12s); optional second beat is S5's session break emptying the window
while the memory file stays put.

### The trace format (1.0 → 1.3)

A trace is a single JSON file describing one complete agent run: `meta`, the
available `tools`, an `initialArtifact` (the visible "world"), and an ordered
`events[]` array. Every event carries a hand-tuned `tokens` estimate; the engine
folds over them to derive cumulative context usage. Tool results carry **full
artifact snapshots, not diffs**, which keeps scrubbing O(1). The schema is
TypeScript enforced with zod, exported to `docs/trace.schema.json`, and validated in
CI on every push. Each version bump was backward compatible and shipped with a
dedicated test re-validating every prior trace unchanged:

- **1.0** — the base shape (system_prompt, user_message, thinking, tool_call,
  tool_result, assistant_message). Shipped with Episode 01. *Why:* establish a
  format that mirrors the shape of real agent transcripts.
- **1.1** — adds `context_evicted` (the window dropping its oldest items when full;
  `tokens` = the amount reclaimed, which the engine subtracts) and an optional
  `annotation` on any event. Shipped with Episode 1.5. *Why:* overflow is the whole
  subject of 1.5, and the validation fold was rewritten to mirror the engine
  (assert `0 ≤ running ≤ window` at every step) so a file can never drift from what
  the engine derives.
- **1.2** — adds `search` and `fetch` events, a top-level `sources` registry, and
  `citations` binding answer spans to sources. Shipped with Episode 02. *Why:*
  retrieval needs sources and provenance; a schema rule enforces that a source can
  only be cited after it was fetched `ok` ("a page it can't read, it can't cite").
- **1.3** — adds `compaction` (replaced items collapse into one lossy summary),
  `session_break` (empties the window; only the file layer survives), and
  `memory_write` / `memory_read` (a note is a file). Shipped with Episode 03. *Why:*
  memory is the finale's subject; a schema rule enforces that a `memory_read`'s
  content is byte-identical to what was written ("you read back exactly what you
  wrote").

### The replay engine

A pure, headless module (`src/trace/`, zero React imports). `createReplay(trace)`
returns `stateAt(i)`, `next()`, `prev()`, `seek(i)`, `play()`, `pause()`, where
`stateAt` yields `{ event, contextItems, tokensUsed, artifact, sourceStates }`.
React binds to it through zustand; WebGL scenes read the store via `.getState()`
inside `useFrame` (a cross-reconciler pattern, so the engine never learns about
React). It renders any conforming trace — the same engine plays all seven files
across four episodes, no forks.

### The docs

`README.md` (pitch + per-episode sections with GIFs), `docs/trace-format.md` (full
schema documentation), `docs/trace.schema.json` (checked-in JSON Schema),
`public/llms.txt` (a GEO description covering all four episodes and the 1.3 schema),
`NOTES.md` (the running decision log — 900+ lines, the primary source for §6 below),
`CLAUDE.md` (the binding design-skill contract), and per-episode briefs
(`EPISODE-*-BRIEF.md`).

### The launch kits

`docs/launch.md` holds four launch packages, one per episode: an X thread (clip-first
in every case), a Show HN title + first comment (Ep 01), a LinkedIn post for the
SEO/GEO audience (Ep 02), a portfolio blurb, and a step-by-step recording recipe for
each share clip. Placeholder GIFs exist in `docs/media/` (replay, eviction,
citations, compaction).

---

## 2. By the numbers

Measured on 2026-07-19 (build on Node 22.20.0 via fnm; Lighthouse on the live
GitHub Pages site).

| Metric | Value |
|---|---|
| Tests | **63** (25 replay-engine + 38 schema), all passing |
| Trace corpus | **7 traces, ~107 events**, versions 1.0–1.3 |
| Build time | **7.94 s** (`tsc -b` + vite build + prerender of 5 pages) |
| Total commits on `main` | **28** (2026-07-12 → 2026-07-19) |
| Total gzipped JS in `dist` | **438.4 KB** across all chunks |
| Shared three.js / R3F chunk | **250.2 KB gz** (`SceneA`, lazy, loaded once per page) |
| Global chunk | 59.3 KB gz |

### Trace corpus

| Trace | Events | Version | Episode |
|---|---|---|---|
| `fix-broken-page` | 20 | 1.0 | 01 |
| `example-minimal` | 6 | 1.0 | (spec sample) |
| `the-loop-trap` | 14 | 1.1 | 1.5 (F1) |
| `context-overflow` | 14 | 1.1 | 1.5 (F2) |
| `bad-observation-recovery` | 14 | 1.1 | 1.5 (F3) |
| `reheat-rice` | 13 | 1.2 | 02 |
| `tokyo-trip` | 26 | 1.3 | 03 |

### Per-page gzipped JS vs the 450 KB budget

The per-page figure is the sum of the exact chunks a page loads with every lazy
canvas triggered (global + the shared three.js chunk + the episode chunk). Values
from the V4 measurement, cross-checked against the fresh build above (the build is
unchanged since):

| Page | Per-page JS (gz) | Budget | Headroom |
|---|---|---|---|
| Episode 01 | ~393 KB | 450 KB | ~57 KB |
| Episode 02 | 401 KB | 450 KB | 49 KB |
| Episode 1.5 | 407.2 KB | 450 KB | 42.8 KB |
| Episode 03 | 412.8 KB | 450 KB | 37.2 KB |

All four under budget; the shared 250 KB three.js chunk dominates every page and is
the main reason the headroom is tightest on the WebGL-heaviest pages.

### Lighthouse re-measured now (live)

**Desktop** (preset), scores /100:

| Page | Perf | A11y | Best-Pr | SEO |
|---|---|---|---|---|
| Landing | 100 | 100 | 100 | 100 |
| Episode 01 | 99 | 100 | 100 | 100 |
| Episode 1.5 | 99 | 100 | 100 | 100 |
| Episode 02 | 99 | 100 | 100 | 100 |
| Episode 03 | 99 | 100 | 100 | 100 |

**Mobile** (default preset — throttled), Perf / A11y:

| Page | Perf | A11y | LCP |
|---|---|---|---|
| Landing | 99 | 100 | 1.2 s |
| Episode 01 | 100 | 100 | 1.1 s |
| Episode 02 | 99 | 100 | 1.2 s |
| Episode 1.5 | 92 | 100 | 2.6 s |
| Episode 03 | 90 | 100 | 2.8 s |

§1 budgets were Perf ≥ 85 mobile / ≥ 95 desktop and A11y ≥ 95. **Every page passes
on both form factors.** The two WebGL-heaviest pages (1.5, 03) are the lowest on
mobile Perf (92, 90) with the slowest LCP (~2.6–2.8 s) but still clear the bar.
(Note: a first desktop run of Episode 01 returned Perf 74 / TBT 670 ms; a clean
re-run gave 99 / 30 ms — the first was CDN/cold-start noise, not a regression.)

### Episode-by-episode timeline (from git)

| Episode | Milestones | Dates | Merged |
|---|---|---|---|
| 01 | M0–M5 | 2026-07-12 → 07-13 | PR #1–#6 |
| 1.5 | T1–T4 | 2026-07-14 → 07-15 | PR #7 |
| 02 | U1–U4 | 2026-07-15 → 07-16 | PR #8 |
| 03 | V1–V4 | 2026-07-17 → 07-19 | PR #9 |

The entire season was built in **eight days**.

---

## 3. Consistency audit

Walking the four episodes in order as a stranger would, looking for drift. Severity
tags: **[Med]** worth resolving before Episode 04; **[Low]** cosmetic or defensible.
Nothing here is fixed — this is a findings list.

**A1 — [Med] Per-source colour hues break the §6 palette (Episode 02 only).**
Episode 02's source chips and citation threads use a per-source `faviconHue`,
introducing hues outside §6's fixed telemetry palette (amber / cyan / green /
coral). It is the only place in the series that steps outside its own colour system.
It was flagged at U2/U3/U4 in NOTES and consciously accepted (the brief adds the
field; saturation kept moderate, confined to small dots + threads) — but it remains
the clearest cross-episode visual inconsistency.

**A2 — [Med] The replay rig layout differs on Episode 02.** Episodes 01, 1.5, and 03
render the showpiece replay in the shared 3-across grid
(`md:grid-cols-[1.15fr_0.85fr_1fr]`, from `ReplaySection`). Episode 02 alone uses a
2-over-1 layout (transcript + context meter in a row, sources/answer panel full-width
below, `md:grid-cols-2`). It's deliberate — the citation threads need horizontal
width — but a stranger scrubbing all four replays sees the series' signature
component reshape on one episode.

**A3 — [Low/Med] Hero copy pattern is inconsistent on Episode 1.5.** Episodes 01,
02, and 03 open with a second-person question — "What happens when you give an AI a
task?", "When AI doesn't know, what happens next?", "What does an AI remember about
you?". Episode 1.5 opens with a flat declarative title, "Where agents go wrong." The
one non-integer episode is also the one that breaks the interrogative hero voice.

**A4 — [Low/Med] The marquee WebGL scene is driven differently per episode.** How
the signature scene advances is not consistent: Episode 01's context window is
scroll-scrubbed in S3 and replay-driven in S4; Episode 1.5's eviction is
replay/autoplay only (no scroll-scrub — a flagged deviation from its brief);
Episodes 02 (funnel) and 03 (compaction) are scroll-scrubbed pinned sections. Each
choice is individually justified in NOTES, but there is no single "this is how the
big scene works" interaction a viewer can learn once and reuse.

**A5 — [Low] Episode 1.5's hero WebGL parity was only just restored.** Until commit
`d6603be` (2026-07-19), Episode 1.5 shipped a static hero while 01/02/03 all
animate — a legacy gap (`HeroAmbient` didn't exist when 1.5 was built, and it was
never retrofitted). Now fixed and verified live (the 1.5 hero canvas renders 1,140
draw calls/second). Resolved, but it means the series carried a visible hero
inconsistency for four days, and the fix is fresh.

**A6 — [Low] Closing-heading form varies; only 01/02/03 share the "Watch…" opener.**
The showpiece sections in 01/02/03 open with a consistent imperative ("Watch an
agent fix a real page", "Watch it search, read, and cite", "Watch an AI compress its
own memory"); Episode 1.5 has no equivalent single "Watch…" heading (it's
vignette-structured). The closing h2s are all bespoke ("What you can now explain" /
"Good agents aren't the ones that never err" / "You just watched what the agent
rewards" / "Four episodes, one story") — fitting individually, with no repeated
close motif.

### What is consistent (strengths, for balance)

- **Replay controls + keyboard behaviour are identical everywhere.** All episodes
  import the same `Controls`, `Timeline`, and `LoopIndicator` from
  `src/episode/replay/` — no forks. The timeline is one native range slider, so
  arrow-key stepping, focus rings, and touch behaviour are the same on every replay.
- **Reduced-motion parity is clean.** Every episode degrades to the same 2D
  context-meter / static figures; the prerendered HTML of every page contains no
  `<canvas>`, so the no-JS and reduced-motion paths match.
- **OG images are one template.** All four (`public/og/episode-0*.png`) are
  1200×630, built from the same card layout (Space Grotesk head, IBM Plex Mono
  labels, §6 palette, downward vignette). All resolve on the live site.
- **Episode labelling is uniform** — "Ep. NN" in the title, "Episode NN" as the
  eyebrow, landing cards ordered 01 / 1.5 / 02 / 03 all "Live" plus a "04 · suggest
  a topic" card.

---

## 4. Technical debt & known gaps

Honest list. Several items are `Deferred`/`Accepted` in NOTES; they are collected
here, not re-litigated.

- **Toolchain fragility (highest operational risk).** The default Node 22.23.1 on
  this machine *breaks* `vite build` (`@tailwindcss/vite` → `enhanced-resolve`
  "getType is not a function", a CJS interop failure). The build only works on Node
  22.20.0 via `fnm exec --using 22.20.0`. `pnpm dev` HMR is also broken here (a
  babel/browserslist `findConfigFile` error); the working loop is build → `vite
  preview` → Playwright. CI pins `node-version: 22` and does a fresh install, so CI
  is unaffected — but local development depends on an undocumented-in-README node
  pin. (Captured in NOTES and in memory `reference_agent_anatomy_node_toolchain`.)
- **`review-animations` skill cannot be model-invoked.** Its `SKILL.md` sets
  `disable-model-invocation: true`, so it never appears in the model's skill list;
  the other seven design skills register fine. Every milestone's animation audit gate
  was therefore run **manually** against the skill's `SKILL.md` rather than by the
  skill itself. No milestone was ever machine-audited by the real tool. (Diagnosed
  2026-07-19; the fix — removing that frontmatter line — touches a global shared
  skill outside this repo and was left to the owner's decision.)
- **A1 / A2 above are also debt** — the Episode 02 palette hue and 2-over-1 layout
  are the two places the replay rig has diverged; both would be cheapest to fold into
  a shared, documented rig contract *before* an Episode 04 compounds them.
- **Share-clip GIFs are stepped headless captures, not real recordings.** The GIFs
  in `docs/media/` were captured event-by-event via Playwright + ffmpeg; headless
  RAF is uncapped, so eased motion (the 2.2 s eviction, the compaction collapse)
  can't be wall-clock sampled into smooth frames. They are faithful but stepped.
  NOTES repeatedly says to swap in a real screen recording per `docs/launch.md` for
  launch. **None of the four real 15-second clips has been recorded yet.**
- **Replay index / active tab is not in the URL.** Deferred at M3 and M5 —
  history-API complexity judged not worth it for an essay page. Consequence: a
  mid-replay or mid-tab state can't be linked or shared; a reader always starts at
  event 0.
- **Font subsetting is partial.** Space Grotesk still declares latin-ext /
  vietnamese `unicode-range`s (the browser never fetches them, so it's harmless
  weight-wise, but the subset is not truly minimal).
- **Schema 1.3 naming compromise.** To avoid breaking `tsc` across every prior
  episode (each reads `event.tokens`), 1.3 keeps a `tokens` field on every new event:
  `session_break.tokens === 0`, and `compaction.tokens` *is* the brief's
  `tokensAfter` (there is no separate `tokensAfter` field, only an extra
  `tokensBefore`). Documented as a deviation, but it means the schema field names
  don't match the Episode 03 brief's TS sketch.
- **Brief deviations carried forward (all flagged, none reverted):** Episode 02's
  `reheat-rice` has 13 events where its brief asked for 22–28 (fidelity over filler);
  Episode 1.5's F2 is replay-driven, not the briefed pinned-scroll; Episode 03's S3
  is a dedicated pinned scene rather than re-driving the S5 canvas.
- **No `v1.2.0` release tag.** Episode 02 / schema 1.2 shipped without its own
  release, so the release history jumps v1.1.0 → v1.3.0. (The v1.3.0 notes call this
  out.)
- **Owner-only QA still pending.** Safari (macOS + iOS) — Lenis feel, bloom, pinned
  sections — cannot be tested from the build machine; code-level mitigations are in
  place (WebGL2-required with 2D fallback, `requestIdleCallback` feature-checked,
  `@starting-style`/`text-balance` degrade silently).
- **Stray Finder duplicate files** (`* 2.gif`, `* 2.html`, `* 2.png`, `* 2.json`)
  sit untracked in the working tree; left alone, not committed.

### Would-refactor-before-Episode-04 shortlist

1. Extract the replay rig into one documented component with the 3-across layout as
   the default and width-flexible panels as an opt-in (folds A2).
2. Decide the palette rule for per-source colour once, in `palette.ts`, and apply it
   uniformly or drop it (folds A1).
3. Pin the Node version in `package.json` `engines` + a `.nvmrc`/`.node-version` and
   document it in the README so the toolchain trap isn't tribal knowledge.

---

## 5. Launch readiness

Four share clips, one per episode. For each: is the recipe in `docs/launch.md`
current, and does the scene still record cleanly after the Episode 03 changes?

| Clip | Recipe | Scene state | Verdict |
|---|---|---|---|
| **Ep 01** — S3 → S4, play to the image-heal at EVT 11 | Current | `fix-broken-page` trace + S3/S4 scenes untouched by later work | ✅ Records cleanly |
| **Ep 1.5** — F2 eviction, fill to brim then oldest band falls out | Current | `EvictionCanvas` untouched; the recent hero fix is a *different* section and doesn't touch F2 | ✅ Records cleanly |
| **Ep 02** — S5, answer assembling with citation threads | Current | `SourcesAnswerPanel` untouched by Ep 03 | ✅ Records cleanly |
| **Ep 03** — S3 pinned compaction, `CTX 2,225 → 925` | Current | New this episode; `compaction.gif` was captured off this exact scene | ✅ Records cleanly |

**No recipe needs rewriting and no scene regressed.** The single caveat is the one in
§4: all four *recorded assets* are still stepped headless GIFs. The real 15-second
screen recordings — the §1 hard requirement and the entire clip-first distribution
strategy — have **not** been recorded on real hardware. That is the launch-blocking
step, and it can only be done on the owner's machine (Playwright here is headless and
can't produce a smooth capture).

---

## 6. Retrospective raw material

The most interesting decisions, reversals, and fixes of the whole build, pulled from
NOTES.md and git. Factual, no spin — source material for a write-up.

1. **The toolchain hang.** The default Node 22.23.1 made `vite build` fail at config
   load (a `@tailwindcss/vite` → `enhanced-resolve` CJS interop error), and a
   stale `node_modules` cascaded into `react-dom` "createRoot is not a function" so
   no page would mount. Fixed by pinning Node 22.20.0 via `fnm` and a clean
   `--frozen-lockfile` reinstall; the repo was left CI-identical (no hacks committed).

2. **Four backward-compatible schema bumps.** 1.0 → 1.1 → 1.2 → 1.3, each adding only
   optional fields and each shipping with a test that re-validates every prior trace
   and asserts its version is untouched. The format grew from 6 event types to
   compaction/session-break/memory without ever breaking an earlier episode.

3. **Eviction as a self-checking number (1.1).** `context_evicted.tokens` is the
   amount *reclaimed*, which the engine subtracts, and the schema enforces `tokens
   === Σ(evicted events' tokens)` — so a trace file can never disagree with what the
   engine derives. Chosen over a no-op cost plus a separate field.

4. **The validation fold was rewritten to mirror the engine.** The naive "sum ≤
   window" check couldn't express overflow-then-evict, so validation now folds
   event-by-event (`+tokens`, `−tokens` on eviction) and asserts `0 ≤ running ≤
   window` at every step — the same fold the engine runs.

5. **Per-trace stores without touching the tested engine (1.5).** The whole S4 rig
   was bound to one global zustand singleton that WebGL reads via `.getState()`
   outside React. Rather than risk that path, `makeReplayStore(trace)` +
   `ReplayProvider` were layered on top; with no provider, components fall back to
   the singleton, so Episode 01 stayed behaviourally identical.

6. **"A page it can't read, it can't cite" as a schema rule (1.2).** A source may
   only be cited after it was fetched `ok` earlier — the S4 caption encoded directly
   into `superRefine`, so a trace that cites an unreadable page fails validation.

7. **The token-field invariant (1.3).** The Episode 03 brief sketched
   `session_break`/`compaction` without a plain `tokens` field, but every existing
   component reads `event.tokens`. Keeping the field (with `session_break.tokens ===
   0` and `compaction.tokens` = the post-size) avoided breaking `tsc` across all
   three prior episodes — a deliberate deviation from the brief to protect prior work.

8. **"You read back exactly what you wrote" as a schema rule (1.3).** A `memory_read`'s
   content must be byte-identical to the file it references — the episode's thesis
   turned into a validation constraint, so the trace can't fake perfect recall.

9. **The hero retrofit.** At the very end, the owner noticed Episode 1.5's hero was
   static while every other episode animated. Diagnosed as an accident of build order
   (the reusable `HeroAmbient` didn't exist when 1.5 shipped), not a design choice,
   and fixed in a separate commit — a consistency bug caught only by looking at the
   whole series at once.

10. **The page-yank bug (M2).** A `scrollIntoView` in the transcript scrolled the
    entire document as events advanced (scrollY 0 → 853 while the reader was
    elsewhere). Replaced with container-scoped `scrollTop` math so the window stays
    put and only the panel tracks.

11. **One-canvas architecture, then abandoned on purpose.** Episode 01 used a single
    tracked overlay canvas that follows whichever slot is most visible (frameloop
    `never` when off-screen). Every later episode deliberately used dedicated in-flow
    canvases instead — simpler and lower-regression than extending the slot machinery
    across episodes.

12. **Idle-deferred mounting bought the Lighthouse scores.** Deferring the canvas
    mount to `requestIdleCallback` and gating gsap/lenis behind the same `whenIdle()`
    helper took desktop TBT 430 ms → 0 and mobile Performance 81 → 93.

13. **An offscreen-render bug caught by the audit gate (Ep 02).** Both new Episode 02
    canvases were `frameloop="always"` unconditionally — rendering while off-screen.
    The U3 animation audit caught it; `IntersectionObserver` gating was added to stop
    the frameloop once a section leaves the viewport.

14. **Fidelity over event count.** Episode 02's brief asked for 22–28 events; the
    `reheat-rice` trace shipped 13. Padding would have required hollow "thinking"
    events that violate the no-filler copy bar, so the count was left honest and the
    deviation flagged.

15. **The audit skill that was never really run.** `review-animations` — the
    mandatory motion audit gate — never registered as model-invokable (its
    `disable-model-invocation: true` flag, diagnosed only at the very end). Every
    milestone's motion audit was run by reading the skill's `SKILL.md` and applying
    it by hand, a workaround NOTES records at each gate without knowing the cause.

---

*Written 2026-07-19. Numbers measured the same day against the live deployment and a
fresh local build on Node 22.20.0. This document describes; it changes nothing.*
