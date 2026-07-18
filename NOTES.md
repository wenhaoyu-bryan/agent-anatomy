# Build notes — decisions & things tried

Scratchpad for the build. Becomes material for the write-up post later.

## Decisions delegated by PLAN.md → my calls

- **Repo name: `agent-anatomy`.** First of the three candidates and the most
  descriptive — "anatomy" = looking inside how something works, which is the
  whole premise. `trace-theater` and `visible-agents` were the alternates.
- **Display font: Space Grotesk (variable).** Geometric with technical
  personality, pairs cleanly with IBM Plex Mono (the telemetry voice), subsets
  well for self-hosting. Body: IBM Plex Sans. Telemetry/trace text: IBM Plex Mono.
- **Package manager: pnpm** — matches the owner's other projects.

## Prerendering decision (§8) — locked before M2

**Approach: post-build HTML snapshot via a small SSR bundle + `hydrateRoot`.**
`scripts/prerender.ts` runs after `vite build`: it builds the two page roots
with `vite build --ssr`, calls `renderToString`, and injects the markup into
the built `index.html` files' `#root`. Client entries switch from `createRoot`
to `hydrateRoot`. WebGL/canvas components mount only behind a `useEffect`
"mounted" flag, so the server render emits the DOM fallback (§7 requires that
fallback anyway) — no R3F on the server, no hydration mismatch.

- Why not an SSR framework/plugin: two static pages don't justify one; the
  snapshot script is ~50 lines and keeps Vite boring.
- Verify at M2 (first content-heavy milestone): grep a known essay sentence in
  `dist/**/index.html`. Enforce as a CI check at M5.

## Design-skill workflow contract (owner's rule)

All named skills are installed as of 2026-07-12 — the earlier "not installed,
using mapped equivalents" note is obsolete. Canonical rules live in CLAUDE.md;
short form:

1. **Direction** — `frontend-design`: consult ONLY at M0 (done) and M4.
2. **Motion** — `emil-design-eng` + `animation-vocabulary` whenever writing
   animation/transition code; `improve-animations` may be used during M3
   iteration. §6's motion spec (mechanical expo/quart-out, 200–400ms UI)
   wins on conflict.
3. **Audit gate** — `review-animations` + `web-design-guidelines`, mandatory
   at end of M3 and M5; `writing-guidelines` joins the M4 copy pass. Fix
   everything severity-medium and up, log findings here, don't close the
   milestone until clean.
4. **Never invoke** in this project: `ui-ux-pro-max`, `theme-factory`,
   `canvas-design`, `brand-guidelines`; `apple-design` is installed but stays
   uninvoked. PLAN §6 is the binding design direction — no glassmorphism,
   neumorphism, aurora gradients, or trend styles from any skill.

Session note: `review-animations` exists on disk but didn't register in the
07-12 session's skill list — if the Skill tool can't see it at audit time,
read its SKILL.md directly and apply it manually.

## M0 — walking skeleton

- Vite multi-page: `index.html` (landing) + `episodes/how-an-agent-works/index.html`
  (episode), wired via `rollupOptions.input`.
- `base: "/agent-anatomy/"` in vite.config — all internal links use
  `import.meta.env.BASE_URL` so they work in dev (`/`) and on Pages (`/agent-anatomy/`).
- Tokens live in `src/styles/tokens.css` via Tailwind v4 `@theme`.
- Deploy: GitHub Actions build → Pages artifact on push to main.

### Verified live at M0 (2026-07-12)
- [x] Both routes reachable under `/agent-anatomy/` (HTTP 200, assets resolve).
- [x] Fonts load self-hosted (Space Grotesk + IBM Plex Mono `document.fonts` = loaded).
- [x] Landing → episode link works with base path (`/agent-anatomy/episodes/...`).
- [x] Flight-recorder identity renders: canvas `#0B0E14`, ink `#E6EDF3`, H1 in Space Grotesk.
- Deploy fix: removed `version:` from pnpm/action-setup (conflicted with
  `packageManager` field → ERR_PNPM_BAD_PM_VERSION). Reads version from package.json now.

## M2 — replay UI (DOM only)

- Three-panel S4 (transcript / context / page) on md+, tabbed panels on
  mobile with the timeline persistent. Replay is user-driven only — buttons,
  a native range scrubber (free keyboard support), autoplay. Never scroll-tied.
- zustand store (`src/episode/replay/store.ts`) bridges the headless engine
  to React via `replay.subscribe`. Manual navigation pauses playback.
- `ContextMeter2D` is the temporary 2D meter — after M3 it stays on as the
  reduced-motion / no-WebGL fallback (§7), so don't delete it.
- The fake product page is deliberately **light-mode** so "the world" reads
  as different material from the dark telemetry instrument around it.
- Motion (per emil-design-eng consult, within §6's mechanical spec):
  CSS transitions only (interruptible under rapid scrubbing — no keyframes),
  strong expo-out 140–300ms, `scale(0.96)` press feedback, `@starting-style`
  entry for new transcript rows, tab switches near-instant (frequent action).
- Prerender pipeline implemented (decision above): `vite build -c
  vite.ssr.config.ts` → `scripts/prerender.ts` injects `renderToString`
  output into dist HTML; client entries hydrate when #root has children.
  Verified: essay copy greps in `dist/**/index.html`.
- Verified in-browser (vite preview + Playwright): scrub to any index heals/
  un-heals the page at the right events (image at EVT 11, price at EVT 17),
  autoplay advances ~800ms/event and auto-pauses, pause holds, ArrowRight
  steps the slider, mobile tabs switch panels, no hydration errors.
- Episode page JS: ~80.6 KB gzipped total (global 60.8 + episode 19.8) —
  well under the 450 KB budget with three.js still to come.

### Post-M2 bug pass (owner: "fix the bugs")
- **Page-yank (bad):** `scrollIntoView` in the transcript scrolled the whole
  document when events advanced (scrollY 0 → 853 while reading elsewhere).
  Replaced with container-scoped scrollTop math on `[data-replay-scroll]` —
  window stays put, panel still tracks the current event.
- **Dead highlight fade:** Tailwind `transition-colors` on transcript rows
  fought `.replay-item`'s transition — the later declaration won wholesale, so
  the background snapped. Consolidated background-color into `.replay-item`.
- **favicon** pulled forward from the M5 deferral: `public/favicon.svg`
  (loop-gauge mark in the telemetry palette), linked from both pages.

## M3 — WebGL

- **One-canvas architecture:** a single fixed R3F `<Canvas>` (TrackedCanvas)
  follows whichever registered slot (hero / S3 / S4) is most visible, per
  §7's "one canvas instance, scenes swapped by visibility." Frameloop is
  `never` when no slot is on screen. This also keeps the bloom composer
  simple — exactly one scene renders at a time.
- Scene A: 640 points, ring motif drawn as its own faint closed outline
  (linking ring points into the neighbor web produced a tangle — fixed),
  pulse travels the ring every ~9s and just crosses the bloom threshold.
- Scene B: 1 token = 1 instanced particle (CAP 4096 = the trace's window),
  deterministic settle strata via seeded PRNG, bezier flights ~0.85s with
  HDR color spike → selective bloom via luminanceThreshold=1, instant
  rewinds. Same component serves S3 (scroll scrub, seeded demo stream) and
  S4 (replay events). Camera back-solves from viewport aspect so the box
  fits narrow panels/phones.
- gsap/ScrollTrigger dynamically imported (CJS broke the SSR prerender when
  imported statically; also keeps it out of the initial bundle). three.js
  chunk is lazy — episode initial JS unchanged, full page ≈ 393 KB gz
  (budget 450).
- Fallbacks verified via emulated reduced-motion: no canvas, no pin, static
  S3 meter, 2D S4 meter. webglcontextlost flips mode to fallback live.
- Perf: 61fps sampled during S3 scrub with particles in flight.

### M3 audit gate (review-animations + web-design-guidelines)

review-animations (applied from SKILL.md — not registered in this session):
- Canvas slot fade was 300ms symmetric → tightened to 220ms. **Verdict:
  approve** — all motion GPU-only (transform/opacity/canvas), interruptible
  transitions, no ease-in, no scale(0), reduced-motion honored, Tailwind v4
  gates hover: behind (hover:hover) by default.

web-design-guidelines findings, fixed:
- straight quotes/apostrophes in S3 copy → curly (full sweep lands with the
  M4 writing-guidelines pass)
- section h2s missing text-balance → added
- mobile tablist lacked arrow-key navigation + roving tabindex → added
- missing touch-action: manipulation on controls/slider → added
- transcript panel scroll chained to page → overscroll-behavior: contain
- missing <meta name="theme-color"> → added (#0B0E14)

Deferred (logged, not fixed): replay index / active tab in URL params
(consider at M5), font preload (M5 subsetting task).

## M4 — narrative

- S2 "The Loop": one SVG holding both models; a GSAP scrubbed timeline draws
  the naive PROMPT→ANSWER arrow, dims it to 12%, then draws the ring and
  pops the THINK/ACT/OBSERVE nodes in sequence. No pin — scrubbed across the
  section's viewport pass (start 62% / end 38%), so mobile scrolls naturally.
  Fallback/SSR renders the finished loop statically.
- The loop motif returns in S4 as `LoopIndicator` — a live mini-ring beside
  the transport controls showing the agent's current phase (thinking→THINK,
  tool_call→ACT, tool_result→OBSERVE, aria-live).
- S5 "Debrief": three takeaway cards numbered in category colors, dashed
  episode-1.5 slot, open-source invitation with repo + trace-spec buttons.
- Scroll orchestration: Lenis (dynamic import, disabled under reduced
  motion per §8) bridged to ScrollTrigger via gsap.ticker; `.reveal` section
  entries are progressive-enhancement safe — server HTML ships visible, the
  `js-motion` class arms the hidden state on capable clients only.
- Landing upgraded to the S5 vocabulary: status dots (Live green / In
  assembly / Planned), hover border on the live card.
- writing-guidelines pass: copy conforms (active voice, no filler,
  sentence-case headings, curly quotes). Two deliberate exceptions: the S3
  rhetorical foreshadow is PLAN-verbatim, and em dashes stay — house voice,
  not banned by the binding spec.

## M5 — polish & ship

- **Lighthouse vs §1 budgets** (local `vite preview`, headless Chrome):
  episode desktop Perf 100 / A11y 100; episode mobile Perf 93 / A11y 100;
  landing desktop 100/100. Budgets were Perf ≥85 mobile / ≥95 desktop,
  A11y ≥95 — all met.
  - Got there in two moves: canvas mount deferred to `requestIdleCallback`
    (desktop TBT 430ms → 0ms), then gsap/lenis imports gated behind the same
    `whenIdle()` helper (mobile TBT 360→230ms, mobile 81→93).
  - One a11y contrast fix: broken-image caption in the fake product page
    #8a93a3 → #5d6675 (3.09:1 → passes on white).
- **Fonts**: latin-only imports; cyrillic/vietnamese Plex files no longer in
  dist. Space Grotesk's latin-ext/vietnamese remain declared (unicode-range
  means browsers never fetch them) — acceptable.
- **OG images**: composed as token-styled HTML cards (headline + particle
  strata) and screenshotted to `public/og/*.png` (1200×630); full og/twitter
  meta + canonical on both pages.
- **llms.txt** at site root (GEO); README rewritten around the replay GIF
  (41 frames captured event-by-event via Playwright → ffmpeg, 1.0 MB);
  `docs/launch.md` written (X thread, Show HN, portfolio blurb, clip recipe).
- **CI** now greps the prerendered essay text in dist (the §8 view-source
  requirement is enforced, as decided pre-M2).
- **Reduced-motion final pass** (emulated): no canvas, no pin, no reveal
  arming, static loop diagram + static meter, every section heading visible.

### M5 audit gate (review-animations + web-design-guidelines)

- review-animations: the only motion-adjacent M5 change is the idle-deferred
  canvas mount, which reuses the existing 220ms fade — no new animations,
  no findings. **Approve.**
- web-design-guidelines: OG/meta complete with image dimensions + canonical;
  no new interactive elements; contrast finding fixed (a11y 100 both pages);
  pages have no `<img>` elements (inline SVG only). **Pass.**
- Still consciously deferred: replay index / active tab in URL params —
  history-API complexity outweighs value for an essay page; revisit if
  people start sharing mid-replay states.

### Manual QA left for the owner (can't be tested from this machine)
- Safari (macOS + iOS): Lenis feel, bloom rendering, pinned S3. Code-level
  mitigations already in: requestIdleCallback feature-checked, WebGL2
  required with 2D fallback, @starting-style/text-balance degrade silently.
- The 15-second share clip: record per docs/launch.md (S3 scrub → S4 play
  to the image-heal at EVT 11).

### Known deferrals
- Font subsets currently include cyrillic/latin-ext; subset to used glyphs at M5.
- Playwright MCP runs in an isolated FS here — screenshots can't be handed back;
  verifying rendering via `document.fonts` + computed styles instead.

## Episode 1.5 — "Where agents go wrong" (fast-follow; brief: episodes/EPISODE-1.5-BRIEF.md)

Milestones T1–T4 (smaller than Ep 01 — pipeline exists). Branch per milestone,
PR each, same as Ep 01.

### T1 — traces + schema (this milestone)

Schema bumped to **1.1**, backward compatible (1.0 traces validate/render
unchanged; the reject tests prove it). Two additions, both optional:

- **`context_evicted` event** `{ evictedEventIds: string[], tokens }` — the
  window dropping its oldest items when it fills. Design call: `tokens` is the
  amount **reclaimed**, and the engine *subtracts* it (the marker is not itself
  window content). Chose this over a no-op cost + separate field so there's one
  number, and made the schema enforce `tokens === Σ(evicted events' tokens)` so
  the file can never drift from what the engine derives.
- **`annotation?`** on any event — authorial margin note ("same result, a second
  time"). Added to `eventBase`, so every type gets it.

- **Validation now folds like the engine** (`+tokens` per event, `−tokens` per
  eviction) and asserts `0 ≤ running ≤ window` at *every* step — replaced the
  old "naive sum ≤ window" check, which couldn't express overflow-then-evict.
  Same fold in `validate-traces.ts` (reports `peak/window`, not a misleading
  sum). Also: version stays honest — 1.1-only features are rejected in a trace
  still declared `1.0`.
- **Engine** (`replay.ts`): frame fold rebuilds a fresh live-window array each
  step; eviction filters out named ids and subtracts. 1.0 traces are unaffected
  (`live === events.slice(0, i+1)`), so no behavioural change to Ep 01.
- Touched three exhaustive `event.type` sites so `tsc -b` stays green:
  `eventMeta.ts` (EVENT_META `EVICT` + `eventBody`), `palette.ts` (category →
  `system`). `LoopIndicator.phaseOf` already had a default. **The real visual
  treatment of eviction — the transcript margin note and the F2 particle
  fade-out/evict — is T2/T3, not done here.**

The three traces are screenplays (8–14 events each, per brief):
- `the-loop-trap` (F1, 14 ev) — edits land in source, page served from a stale
  build; two full edit→render cycles show no change, ends mid-loop on a
  trailing thought (no rescue — the discomfort is the lesson). renderId stays
  `banner-summer` throughout (nothing heals).
- `context-overflow` (F2, 14 ev) — reads four large files to **peak 4042/4096**,
  then one `context_evicted` drops e01–e05 (incl. the user request e02),
  reclaiming 1408; agent then answers a mis-scoped question. This is the
  episode's share-clip scene. renderIds: `checkout-code` (static).
- `bad-observation-recovery` (F3, 14 ev) — a stale cached "200 OK" almost fools
  it; it verifies against the real file, finds the empty `action` + non-submit
  button, fixes both, fresh-renders. The only happy ending; closing
  `assistant_message` carries the thesis (verify before you trust) in PM voice,
  without the word "harness". renderIds heal `form-broken → form-wired →
  form-works`.

**renderIds to build in T2** (ProductPage-style component switch, per §4.2):
`banner-summer`; `checkout-code`; `form-broken`, `form-wired`, `form-works`.

Verified: `pnpm test` 31 passing, `pnpm trace:validate` all 5 green,
`schema:build` diff clean, full `pnpm build` green. Demo = read the three
traces as text.

### T2 — page + vignettes (this milestone)

Episode 1.5 page (`episodes/where-agents-go-wrong/`) with hero, 30-second
recap, F1/F2/F3 vignettes, and close. F1/F3 are full replays; F2 uses the
temporary 2D meter (the WebGL eviction scene is T3).

Key decision — **per-trace replay stores via React context, singleton left
intact.** The whole S4 rig was bound to one global `useReplayStore` singleton,
and `ContextScene` (WebGL) reads that singleton with `.getState()` inside
`useFrame` — outside React. Rather than risk Ep 01's GL path, I kept the
singleton and layered context on top:

- `makeReplayStore(trace)` builds an independent store; the Ep-01 singleton is
  now just `makeReplayStore(episodeTrace)`.
- `ReplayProvider` + `useReplay(selector)` (context, default = the singleton).
  The six DOM replay components read via `useReplay`; with no provider they get
  the singleton, so **Episode 01 is behaviorally unchanged** (verified live:
  three-panel rig + particle scene intact).
- `ContextScene` still imports the singleton and calls `.getState()` —
  untouched. Each Episode 1.5 vignette wraps its own `ReplayProvider`, so their
  playheads are independent.

Transcript is now eviction/annotation-aware without touching the tested engine:
it renders `events.slice(0, index+1)` (identical to `contextItems` when nothing
is evicted), dims events an eviction has dropped, renders the `context_evicted`
marker as a dashed −tokens row, and shows any `annotation` as a small amber
margin note. `ContextMeter2D` gained an eviction footer ("N items left the
window · −tokens"); its stacked bar shrinks naturally because `contextItems`
drops the evicted events. `replay.ts` and `schema.ts` were NOT changed — T1's
tested contract stands.

renderIds built: `banner-summer` (F1 stuck banner), `form-broken/-wired/-works`
(F3 heal) in `src/episode15/ArtifactView.tsx`. F2 needs no page panel (the meter
is the show), so `checkout-code` has no renderer — dropped from the T2 list.

Wiring: `vite.config.ts` input + `entry-server.renderEpisode15` + `prerender.ts`
injection + a body-only CI grep ("Two ideas carry this episode", chosen over a
title that also appears in `og:title`).

Deferred to T3/T4 per brief: F2 particle overflow + eviction scene and pinned
scroll (T3); landing card flip to LIVE + Ep 01 S3 foreshadow link, OG image,
writing-guidelines + audit gate, budgets re-measure, README/launch (T4).

Verified live (Playwright, dev server): F1 loop rhyme + climbing meter +
annotations, F2 eviction (EVICT −1408 row, meter shrinks 4042→2778), F3 form
heal + thesis reply, Ep 01 replay + WebGL scene unregressed. `pnpm build` green,
31 tests, schema diff clean.

### T3 — the eviction scene (this milestone)

F2's context panel is now a WebGL particle scene (`src/episode15/EvictionCanvas.tsx`),
the episode's centerpiece / 15-second clip. It fills to the brim as the agent
reads files, then at the `context_evicted` event the oldest particles — the
original request and first reads — sink and fade out the bottom while the
survivors drop to fill the drained space; the post-eviction thinking + reply
land on top as a colored band. Driven by F2's replay (transport + autoplay).

Architecture:
- A dedicated in-flow `<Canvas>` in the F2 panel, NOT Ep 01's tracked-overlay
  slot machinery — F2's scene lives in its panel and never follows scroll, so a
  normal canvas is far simpler and leaves Ep 01's GL untouched.
- The scene reads F2's per-vignette store via `useReplayApi()` (new) passed as a
  prop into the Canvas, then `storeApi.getState()` inside `useFrame` — same
  cross-reconciler trick ContextScene uses with the singleton, so no React
  context bridging across the Canvas boundary.
- `F2ContextPanel` keeps the DOM token numbers (§7) and mounts the canvas after
  idle + a WebGL check; reduced-motion / no-WebGL falls back to the T2 2D meter
  (whose bar already shrinks at the eviction), so the lesson survives with no
  canvas. SSR renders the fallback.

Particle model (`buildModel`): one token = one particle, tagged with color +
evicted flag + arrival frame. Deterministic seeded strata (bottom-up). Assumes
the evicted events are the oldest contiguous block (true for F2), so survivors
sink by a single drained height instead of reflowing. Buffer sized to the
trace's total tokens (F2 = 4186).

Motion (per §6 mechanical feel; motion-tier skills not invoked — noted for the
T4 audit): fill = staggered fade/rise-in with an HDR arrival glow → bloom;
eviction eases in over 2.2s, `tau` driven by cursor≥evictFrame. **Rewind snaps
tau instantly** (like ContextScene's instant fill-rewind) so scrubbing back
never replays 1,408 flares and blows out bloom. Evicted particles glow via
`1 + 1.4·sin(local·π)` — exactly 1.0 at rest so nothing flares before eviction
starts (an earlier `1.45+…(1−local)` blazed at the brim — fixed).

Deviation flagged: the brief calls F2 "a pinned scroll section like Ep 01's
S3." I kept it replay-driven (transport + autoplay) instead of scroll-scrubbed,
because the 15-second clip needs deterministic autoplay and the replay already
computes correct eviction frames; a pinned scroll-scrub can't easily produce a
loopable recording. Easy to add S3-style pinning if the owner wants the literal
treatment.

Verified live (Playwright): clean brim (98.7%, colored oldest-context band at
the floor), forward eviction (level drains, oldest band dissolves), settled
(67.8%, post-eviction reply as a band on top), 0 console errors, Ep 01
unaffected. T3 is the visual-iteration milestone — expect tuning rounds on
drama/color/particle density.

## T4 — copy, polish, ship

Copy pass: read every Ep 1.5 string (hero, 30-second recap, three vignette
ledes, close/thesis, F2 panel labels). No rewrites needed — the copy was written
to the same screenplay bar and already reads active, concrete, and hedge-free.
The thesis passage intentionally describes harness behaviour (verification,
checkpoints, run limits) without ever using the word "harness", per the brief.

Audit gate (motion + web-design). The dedicated tier-3 skills weren't available
to invoke in this session, so I ran the checklist manually against §6 and
standard a11y/motion guidance. **No severity-medium-or-above findings.** What I
checked:
- Motion: eviction is deterministic + eased, rewind snaps (no bloom re-flare),
  flare is 1.0 at rest (nothing blazes pre-eviction), reduced-motion → 2D meter.
  Reveals are 500ms ease-mechanical, SSR-visible, and off under reduced motion.
  Autoplay is user-driven only — no scroll-triggered perpetual WebGL churn.
- Web/a11y: global `:focus-visible` ring (2px tool) covers the new recap/
  foreshadow/landing links; sections carry `aria-labelledby`, heading order is
  h1→h2, skip link present; the canvas exposes an `sr-only role="status"` token
  readout and the recap bar a `role="img"` label; decorative SVG is aria-hidden.
  Palette is strictly §6 tokens — no new colors, no glass/neumorph/aurora.
- Low (accepted, logged not fixed): recap-fill is a perpetual `alternate`
  animation (trivial cost, illustrative; frozen under reduced motion); transport
  buttons are 36px touch targets (matches Ep 01).

Reduced-motion + mobile: verified live. Reduced motion → F2 shows the 2D meter,
reveals stay put, recap bar freezes filled. Mobile (390×844): no horizontal
overflow (scrollWidth == viewport), controls wrap, panels stack single-column,
the WebGL box fits (322px) and renders.

OG image (`public/og/episode-1.5.png`, 1200×630): built from an HTML card that
reuses the episode-01 card layout (Space Grotesk head, IBM Plex Mono labels,
§6 palette, downward vignette) with an eviction motif — the oldest band (grey
system / coral request) sinking and fading out the box floor, footer reads
"CTX 2,778 / 4,096 · CONTEXT EVICTED". Screenshotted at 1200×630 via Playwright.

Eviction GIF (`docs/media/eviction.gif`, 468×339, ~124 KB): captured from the
real F2 canvas via Playwright — event-by-event fill to the brim, then the
glowing oldest band cascading out the bottom, then the drained window. Assembled
with ffmpeg (concat demuxer for per-frame hold + two-pass palette). Note:
headless RAF is uncapped, so the 2.2s ease can't be wall-clock-sampled into many
even frames; the GIF is a faithful stepped telling. For launch, a real screen
recording (steps in docs/launch.md) will read smoother — swap it in if wanted.

Docs: landing 1.5 card flipped IN ASSEMBLY → LIVE with link (card component
unchanged); Ep 01 S3 foreshadow "episode 1.5" is now a link; llms.txt gained the
1.5 page + a 1.1-schema line; README gained an "Episode 1.5" section + the GIF;
docs/launch.md gained a second-launch X thread ("failure-modes sequel") + an
eviction-clip recording note.

Temp for capture: bumped `EVICT_DUR` to 14 to try to slow-mo the fall for the
GIF, reverted to 2.2 before committing (grep-confirmed). A throwaway Vite server
on :5199 was used for capture and killed; the owner's :5174 dev server is
untouched.

## Episode 02 — "How AI Reads the Web" (full episode; brief: EPISODE-02-BRIEF.md)

Milestones U1–U4. Owner ran `/goal … until finished`, so I'm building through
all four without stopping for sign-off; each milestone still gets its own commit
+ NOTES entry, and the U1 trace is surfaced for the owner to read as a screenplay.

### U1 — schema 1.2 + reheat-rice trace (this milestone)

Schema bumped to **1.2**, backward compatible (1.0 and 1.1 traces validate and
render unchanged; a dedicated test replays all five prior traces and asserts
their versions are untouched). Additions, all optional:

- **`search` event** `{ query, results: {sourceId,title,url,snippet}[] }` and
  **`fetch` event** `{ sourceId, url, status: "ok"|"unreadable", extracted? }`.
- **Top-level `sources` registry** `{ sourceId, title, url, faviconHue }[]` —
  declared once, referenced by every result/fetch/citation.
- **`citations`** on `assistant_message` — half-open `[spanStart, spanEnd)` char
  spans of the answer text bound to `sourceIds`.

Token semantics (the risk I flagged, now resolved): `tokens` = what enters the
window, so search/fetch fold `+tokens` exactly like every other event — **no
engine token-fold change**. A `fetch ok` must carry `extracted` (the fragment
that entered context); an `unreadable` fetch omits it and costs only the ~20
tokens of an empty response. This keeps the existing `superRefine` fold and the
`validate-traces` peak calc unchanged for the window math.

Integrity rules added to `superRefine`, folding alongside the token math:
- every referenced `sourceId` must be in the registry; registry ids unique;
- citation spans satisfy `0 ≤ start < end ≤ text.length`;
- **a source can only be cited once it's been fetched `ok` earlier** — a page
  that can't be read can't be cited (S4's caption, encoded as a schema rule);
- `search`/`fetch`/`citations`/`sources` are rejected in a 1.0 or 1.1 trace, so
  the version field stays honest (mirrors the 1.1 gate).

**Engine** (`replay.ts`): added `SourceStatus` + per-frame `sourceStates`
(`listed` → `read`/`unreadable`), cloned fresh per frame so scrubbing is safe.
Monotonic — a read source stays read even if its fragment is later evicted (the
citation still points there; reheat-rice has no eviction anyway). Store exposes
`sources` (the registry) as a selector; DOM reads live status off
`frame.sourceStates`. `contextItems`/tokens/artifact logic untouched, so Ep 01
and 1.5 are behaviorally unchanged (46 tests green, incl. the pre-1.2 traces).

Exhaustive `event.type` sites updated so `tsc -b` stays green: `eventMeta.ts`
(EVENT_META `SEARCH`/`FETCH` + `eventBody`), `palette.ts` (`categoryOf` →
`tool`/cyan for both). Everything else reads via `EVENT_META[...]` lookups, so
no other site needed touching.

**The trace** (`traces/reheat-rice.trace.json`, 13 events, v1.2, window 4096,
peak 1672): "Is it safe to reheat rice?" — asks → thinks (knowledge isn't live)
→ searches (5 results: agency, cooking guide, JS recipe blog, forum, news) →
selects three → reads the agency page (Bacillus cereus spores survive cooking;
the danger is warm storage, not reheating) → reads the cooking guide (agrees,
adds cool-fast/fridge-within-an-hour) → **fetches the recipe blog → `unreadable`,
JS-only shell (the GEO beat)** → synthesises (the myth vs the real risk) →
answers with two citations pointing at the two pages it read. Forum + news are
deliberately left unread — teaches selection. Citation offsets computed against
the exact answer string (curly apostrophes) and asserted by the schema, so a
copy edit that shifts them fails validation.

**Deviation flagged (count):** the decisive 9-beat sheet asks for "~22–28
events" but yields 13 honest ones at Ep-01 tightness. Padding to 24 would need
hollow thinkings (violates the no-filler copy bar) or a second search (the brief
says "one search, 5 results," marked decisive). I chose fidelity + no filler;
easy to expand later via a refined follow-up search or a news-article fallback
read if the owner wants the literal count.

Verified: `pnpm test` 46 passing (was 31; +15 for 1.2), `pnpm trace:validate`
all 6 green, `pnpm schema:build` idempotent + regenerated, full `pnpm build`
green (all three existing pages still prerender; three.js still lazy). No UI yet
— demo = read the reheat-rice trace as text.

### U2 — replay rig extension (this milestone)

New episode page `episodes/how-ai-reads-the-web/` (`src/episode02/`), wired like
Ep 1.5: `vite.config` input, `entry-server.renderEpisode02`, `prerender.ts`
injection, and a body-only CI grep ("an answer assembles with visible", chosen
so it doesn't also appear in og:title). Hero + S5 replay + a minimal series-index
close; S2/S3/S4 scenes and the full S6 close come in U3/U4.

**S5 rig** (`ReadingReplay.tsx`): Ep-01's three-panel rig reused via a
`ReplayProvider` bound to the reheat-rice trace, driving the shared `Controls`,
`Timeline`, `LoopIndicator`, `TranscriptPanel`, `ContextMeter2D`. Layout is
**2-over-1**, not 3-across: transcript + context meter in a row, then the
sources+answer showpiece **full-width below**. Reason (flagged deviation): with
the panel as a narrow third column the citation threads bunched into a vertical
band; giving the showpiece full width lets the threads arc horizontally
(answer left → source chips right), which is the whole point of the share clip.
Mobile keeps the tabbed one-panel-at-a-time pattern (verbatim from
`ReplaySection`), with the sources panel stacking chips-over-answer.

**`SourcesAnswerPanel.tsx`** — the new third panel, DOM/SVG only (no WebGL):
- Source chips read `frame.sourceStates` (the v1.2 engine field): appear as the
  search lists them ("found"), light with a hued dot + glow when read, and
  strike through + dim with "✕ unread" when unreadable (the blog). `faviconHue`
  drives each chip's dot/thread colour.
- When the answer arrives, its text renders with cited spans as inline
  `<button>`s (native focus + tap), and **SVG citation threads** are measured
  from the live layout (`getBoundingClientRect` relative to the panel, so they
  track scroll/resize + a `document.fonts.ready` re-measure) and drawn on with
  `pathLength=1` + `stroke-dashoffset 1→0`, staggered per citation — "the answer
  assembling with threads reaching back." Hover/focus a citation (or later a
  chip) highlights its thread group and dims the rest.
- Verified live (Playwright, preview build): jump-to-end → 5 chips in the right
  states (nfsa/kitchen-basics read, quickbite ✕ unread, cooktalk/daily-ledger
  found), 3 threads (span A→nfsa; span B→kitchen-basics + nfsa) fully drawn
  (dashoffset 0), 2 keyboard-focusable citations, focus on span A dims the
  other group to 0.18, **0 console errors/warnings** (clean hydration).

Shared-component touch: `TranscriptPanel.EventText` now renders `search` (query
+ result count, muted) and `fetch` (ok → "Read {url}" + the extracted fragment
in a cyan-ruled quote; unreadable → a coral "Couldn't read" note). Ep 01/1.5
never carry these types, so they're unaffected.

Design note for the U4 audit: `faviconHue` introduces per-source hues, a mild
departure from §6's strict telemetry palette. Kept at moderate saturation and
confined to small chip dots + the threads (the brief explicitly adds the field);
the luminous thread is a soft blurred underlay, not neon — no glass/neumorph/
aurora. Flagged here for the review-animations + web-design gate in U4.

Verified: `pnpm test` 46 green, `pnpm trace:validate` 6 green, schema diff
clean, full `pnpm build` green (four pages prerender now; ep02 initial JS ~21.5
KB / 7.6 KB gz). Reduced-motion path = the existing 2D meter + the global
transition-collapse (threads land in final state). Demo: play S5 to the end and
watch the answer thread back to its two sources.

### U3 — the funnel + scenes (this milestone)

Three WebGL/scene pieces, all **dedicated in-flow Canvases** (the Ep 1.5 T3
precedent — NOT Ep 01's tracked-overlay slot machinery), gated behind a shared
`useGlReady()` (webgl + idle + not-reduced-motion; SSR renders neither):

- **Hero ambient** (`HeroAmbient.tsx`) — reuses Ep 01's `SceneA` in its own
  canvas, so the series reads as one identity.
- **S3 funnel** (`FunnelCanvas.tsx` + `FunnelSection.tsx`) — the new WebGL work.
  A tall section with a **CSS-sticky pin** (no GSAP, no scroll-jacking); a
  rAF-throttled scroll handler writes progress 0→1 into a ref the scene reads
  each frame. Choreography, all a pure function of progress: a field of 72
  page-glyph planes (the web) → 10 brighten to cyan (results) → 3 are drawn
  down to the window mouth (selected) → the other results recede → 900 instanced
  fragments stream from the 3 into a bounded, hairline-edged **context window**
  (the same box/particle language as Ep 01) and settle bottom-up. HDR flare
  mid-flight → bloom; calm when settled.
- **S4 reading figure** (`ReadingFigure.tsx`) — DOM/SVG, not WebGL: a readable
  page → boilerplate falls away → fragment kept; beside it the JS-only shell
  (`<div id="root">`) → nothing kept. Caption: "a page that can't be read can't
  be cited."

Also built **S2 cutoff** (`CutoffFigure.tsx`, DOM) — the sealed-archive-with-a-
date idea, linking back to Ep 01's context window — even though the brief slots
S2 under U4; it sits naturally before the funnel.

Deviation flagged: the brief calls S3 "pinned, scroll-scrubbed." I used a
CSS-`sticky` pin driven by a scroll handler rather than GSAP ScrollTrigger pin —
simpler, no CJS/SSR import hazard (NOTES M3), and it degrades cleanly: reduced
motion / no-WebGL / SSR render a compact **static** funnel diagram instead of a
340vh scrubbed section (so no dead scroll for those users, and view-source shows
the narrowing).

Audit gate (review-animations + web-design; tier-3 skills still not registerable
this session, ran the checklist manually):
- **Fixed (medium):** both new canvases were `frameloop="always"` unconditionally
  — they'd render offscreen. Added `IntersectionObserver` gating so the hero and
  funnel frameloops go `never` once their section leaves the viewport (§8).
- Motion: funnel is deterministic + scrub-safe (pure fn of progress, rewinds
  clean); citation threads (U2) transition, not keyframe; reduced motion collapses
  everything via the global block. No autoplay perpetual churn.
- a11y: canvases `aria-hidden`; headings h1→h2; citations are focusable buttons
  with aria-labels; source status is text ("read"/"✕ unread"/"found"), not
  colour-only; skip link + focus-visible intact.
- **Flagged, accepted:** `faviconHue` gives sources per-source hues — a mild step
  outside §6's telemetry palette. Kept at moderate saturation, confined to small
  chip dots + threads (the brief adds the field on purpose); the thread glow is a
  soft blurred underlay, not neon. No glass/neumorph/aurora.

Verified live (Playwright, preview): hero ambient renders (drift + loop motif);
funnel scrubs through web → results → selected → window-fill at 0.45/0.66/0.82/
0.93 and animates only while pinned (frameloop gating confirmed); S2/S4 figures
render; **0 console errors** (2 warnings are three.js's `THREE.Clock` deprecation,
also on Ep 01/1.5). Mobile 390×844: no horizontal overflow, replay tabs +
sources panel work. Budget re-measured on the heaviest page (ep02, all scenes +
three.js): **401 KB gz < 450** (§1) — no regression.

### U4 — copy, polish, ship (this milestone)

Most narrative copy landed with its section in U1–U3 (hero, funnel captions, S4
figure, S6 close). U4 = the peripheral ship work:

- **Landing** flipped: Ep 02 card now LIVE with link + blurb; added an Ep 03
  "Planned" slot to keep the series shape (03 now the dimmed slot, not 02).
- **S6 close** (written in U3's commit) — the "So how do you get cited?" payoff,
  ~150 words derived only from what the reader watched (read it / extract it /
  trust it), GEO named once, no pitch; then the series index with Ep 03 planned.
  Gets the brief's extra editing pass — reads as explanation, not marketing.
- **llms.txt**: added the Ep 02 summary + page link, and rewrote the schema line
  for 1.2 (search/fetch/sources/citations) + "three episodes, one engine."
- **README**: new Episode 02 section (funnel / reading / replay bullets) with the
  citation-threads GIF, and the "three episodes, one engine, one backward-
  compatible format" line; the "second consumer" phrasing retired.
- **docs/launch.md**: third-launch section — an X thread (citation-clip-first) and
  a **LinkedIn post aimed at the marketing/SEO/GEO audience** (the second persona
  the brief calls for), plus the citation-clip recording recipe.
- **OG image** (`public/og/episode-02.png`, 1200×630): a token-styled card
  reusing the Ep 01/1.5 card layout (Space Grotesk head, IBM Plex Mono labels, §6
  palette, vignette) with the S5 motif — a short answer whose two spans thread to
  two "read" source chips, the JS blog struck through, a "found" forum. Built from
  an HTML card, screenshotted via Playwright.
- **citations GIF** (`docs/media/citations.gif`, 900px, ~114 KB): four real frames
  captured from the S5 panel — sources found → read (one ✕) → answer + threads
  drawn → a citation hovered — assembled with ffmpeg (concat + two-pass palette).
  Stepped telling like the eviction GIF; a live screen recording per launch.md
  will read smoother for the actual post.

Reduced-motion + mobile re-checked (Playwright): no horizontal overflow at 390px,
replay tabs + sources threads work stacked, funnel falls back to the static
diagram. §1 budget re-measured on all three episodes — ep02 (heaviest) 401 KB gz,
under 450, no regression to Ep 01/1.5.

Verified: `pnpm test` 46 green, `pnpm trace:validate` 6 green, schema diff clean,
full `pnpm build` green (four pages prerender), CI greps pass. Episode 02 is
feature-complete on `feature/episode-02`.

## Episode 03 — "How Agents Remember" (full episode; brief: EPISODE-03-BRIEF.md)

Milestones V1–V4. Feature branch `feature/episode-03`, PR + demo per milestone
(brief says "stop and demo after each"). The resolution of the series' open wound
(1.5's F2 eviction): context is what's in the window now; memory is what gets
written down outside it and survives.

### V1 — schema 1.3 + two-session Tokyo trace (this milestone)

Schema bumped to **1.3**, backward compatible (1.0/1.1/1.2 validate and render
unchanged; a dedicated test re-validates all six prior traces and asserts their
versions are untouched). Four new optional event types:

- **`compaction`** `{ replacesEventIds[], summary, tokensBefore, tokens }` — the
  replaced items collapse into one summary item (the event itself). Folds like an
  eviction plus an insert: net window change `tokens − tokensBefore`.
- **`session_break`** `{ label, tokens: 0 }` — empties the window (running → 0,
  live → []); only the artifact file layer survives.
- **`memory_write`** / **`memory_read`** `{ path, content }` — a note is a file;
  write patches it onto the artifact snapshot, read pulls it back into the window.

**Key design call — every new event keeps a `tokens` field (the invariant).**
The brief's TS sketches `session_break`/`compaction` without a plain `tokens`, but
every existing component (`ContextScene`, `ContextMeter2D`, `TranscriptPanel`,
`EvictionCanvas`, …) reads `event.tokens` on values typed as `TraceEvent`. A
token-less union member would break `tsc` across Ep 01/1.5/02 — exactly the
prior-episode collateral the brief puts out of scope. So: `session_break.tokens`
is enforced `=== 0` (a break costs nothing), and `compaction`'s base `tokens` IS
the brief's `tokensAfter` (the summary is an ordinary window item; its post-size
is its `tokens`, like every other event) — so there is **no separate `tokensAfter`
field**, only the extra `tokensBefore`. Flagged naming deviation, documented in
the changelog. Zero prior-episode logic changed.

**Schema fold (superRefine) additions**, folding alongside the existing token math:
- compaction: `replacesEventIds` must be live; `tokensBefore` must equal their
  summed tokens (mirrors the eviction reclaim check); `tokens < tokensBefore` (a
  compaction must shrink). The summary becomes a live item (can be evicted later).
- session_break: `tokens === 0`; clears the live set + running total.
- memory: track a `files` map (seeded from `initialArtifact.files`, replaced by a
  `tool_result` snapshot, patched by `memory_write`); a `memory_read` must
  reference a written path and its `content` must be **byte-identical** to the
  file — the thesis ("you read back exactly what you wrote"), schema-enforced.
- version gate: the four new types are rejected in a <1.3 trace (mirrors 1.1/1.2).

**Engine** (`replay.ts`): three new fold branches. compaction filters the replaced
ids and pushes itself as the summary item, `tokensUsed += tokens − tokensBefore`;
session_break sets `live = []`, `tokensUsed = 0` (files untouched — the point);
memory_write derives a new artifact snapshot with the note patched into `files`.
`sourceStates`/citations logic unchanged, kept monotonic across the break (a
citation asserts "read at some point in this run"; the final answer cites session-A
reads + the session-B lookup, all valid). Exhaustive switches updated:
`eventMeta.ts` (labels COMPACT/SESSION/WRITE/READ + `eventBody`), `palette.ts`
(compaction/session_break → system-grey = desaturated/lossy; memory I/O → tool cyan).

**The trace** (`traces/tokyo-trip.trace.json`, 26 events, v1.3, window 2400):
"Plan a 3-day Tokyo trip." **Session A (e01–e16):** research burst — 2 searches +
4 fetches (Yanaka guide, quiet-temples, Tsukiji market, November) fill the window
to **peak 2225/2400 (93%)**; the agent notices it's running out (e12), compacts
the six research events (tokensBefore 1730 → tokens 430, ≈4×) so the window drops
sharply to 925, writes `notes/tokyo-trip.md`, reports day-1 progress, then
`session_break` "The next day". **Session B (e17–e26):** empty window; the agent
states plainly it doesn't remember, reads the note back (byte-identical), and — the
lossiness payoff — the summary had kept "some temples close early midweek" but
DROPPED the exact hours, which it now recovers with one fetch of a `temple-hours`
page; finishes days 2–3, writes `itinerary.md` (artifact heals), and answers with
citations to the pages it read. The `travelbuzz-blog` (30-stops) is found but never
read — selection lesson tied to the user's "don't want to cram." Citation offsets
computed against the exact answer string and asserted by the schema.

Tests: 63 green (was 46; +17 for 1.3 — compaction/session_break/memory engine
behavior, a Tokyo two-session integration test, backward-compat, and 7 rejection
rules). `pnpm trace:validate` 7 green. `pnpm schema:build` idempotent (regenerated,
CI git-diff will pass). Demo = read the Tokyo trace as text.

### Local toolchain (this machine — FULLY RESOLVED; read before V2+)

Two problems, now both fixed:
1. **Default Node 22.23.1** made `vite build` fail at config load
   (`@tailwindcss/vite` → `enhanced-resolve` "getType is not a function", a CJS
   interop failure). **Fix: run everything on Node 22.20.0 via `fnm`** —
   installed `fnm` (`brew install fnm`) + `fnm install 22.20.0`; prefix commands
   with `fnm exec --using 22.20.0 pnpm <script>`.
2. **Stale/corrupted `node_modules`** made a whole cascade of deps fail at
   ESM/CJS interop at build/runtime (`tsx` "fe.isESM", `maath`→`three`
   "Vector2 is not a constructor" in prerender, `react-dom` "createRoot is not a
   function" so no React page — not even the live Ep 02 — would mount).
   **Fix: clean reinstall** — `rm -rf node_modules && fnm exec --using 22.20.0
   pnpm install --frozen-lockfile` (2s from the store). After it, the FULL
   `pnpm build` is green: 5 pages bundled + all 5 prerendered, and preview-served
   pages mount with 0 console errors.

**Repo left CI-identical** — no `--configLoader runner` / ESM-`dirname` hacks
(reverted); the diff is only the episode work. CI pins `node-version: 22` and does
a fresh `pnpm install`, so CI is unaffected either way.

**Verification loop for V2+: `vite build` → `vite preview --port 4173` →
Playwright.** (The `pnpm dev` HMR server still throws a babel/`browserslist`
"findConfigFile" error — didn't chase it since build+preview works.) preview binds
IPv6; target `localhost`/`[::1]:4173`. A `http_proxy=127.0.0.1:7890` is set — use
`--noproxy '*'` / `NO_PROXY`. Playwright profile can get a stale
`SingletonLock` — `pkill -f ms-playwright-mcp` + delete the lock if "browser
already in use". See [[reference_agent_anatomy_node_toolchain]].

Verified V1 gates on 22.20.0 + fresh install: `pnpm test` 63 green,
`pnpm trace:validate` 7 green, `pnpm schema:build` idempotent, `tsc -b` clean,
full `pnpm build` green (5 pages prerender). V1 committed at 40f1ad1.

### V2 — replay rig, two sessions, DOM/2D (this milestone)

New page `episodes/how-agents-remember/` (`src/episode03/`), wired like Ep 02:
`vite.config` input, `entry-server.renderEpisode03`, `prerender.ts` inject, and a
body-only CI grep ("reads those notes back and finishes the job"). Hero + S5
`MemoryReplay` showpiece + a minimal series-index close; the S2 recap, S4 figure,
and full S6 finale come in V3/V4 (Ep-02's U2 pattern).

**Rig** (`MemoryReplay.tsx`) — Ep-01's three-panel rig, third panel now the
MEMORY layer: **Transcript | Context window (2D meter) | Memory (files)**. The
two-session timeline, compaction, and the session break are all rendered by
extending the SHARED components (backward compatible — verified Ep 01/1.5/02
still play):

- **`Timeline.tsx`** — `computeSegments()` splits the run at each `session_break`
  into labelled segments ("Session A" / "Session B · The next day", flex-sized by
  event count, current segment highlighted). Traces with no break yield one
  unlabelled segment, so every prior episode is unchanged.
- **`TranscriptPanel.tsx`** — dimming is now driven by `frame.contextItems` (the
  live set the engine already folds), which cleanly covers eviction, compaction,
  AND the session break (after a break, all of session A dims — it's out of the
  window but still in the log). New `EventText` for compaction (summary + "compressed
  N items"), session_break (a divider rule with the label), and memory_write/read.
  A `TokenDelta` badge shows `−(before−after)` for compaction and "cleared" for a break.
- **`ContextMeter2D.tsx`** — a `MeterFooter` helper adds compaction ("N items
  compressed into a summary · −tokens") and session_break ("Session ended — the
  window is empty now"); the stacked bar empties on its own at a break because
  `contextItems` is `[]`.
- **`MemoryPanel.tsx`** (new, Ep-03) — renders `frame.artifact.files` as file
  cards (README filtered out as scaffolding), highlights the file being written/
  read, and shows a "New session — the window is empty. The notes below are still
  here." banner on the break frame. This is the DOM truth the V3 WebGL scene will
  dramatize.

**Verified in-browser** (build + preview + Playwright, 0 console errors): seeking
the timeline to each beat — e13 compaction → **CTX 925/2400**, footer "6 items
compressed … −1300 tokens", 7 live blocks; **e16 session_break → CTX 0/2400, empty
bar**, memory panel still shows `notes/tokyo-trip.md` + the empty-window banner;
e19 memory_read → context rebuilds (+260), note still present; e26 end → both
`notes/tokyo-trip.md` and `itinerary.md` present (artifact heals). Two-session
timeline shows "Session A"/"Session B" + "The next day". tsc clean; 63 tests still
green. Deferred to V4 audit per brief: reduced-motion + mobile-tabs pass. WebGL
condensation + window-empty scene is V3.

### V3 — WebGL condensation + window-emptying scene (this milestone)

The Context panel's 2D meter is now backed by a particle scene, modeled 1:1 on
Ep 1.5's F2 (`EvictionCanvas` + `F2ContextPanel`) — one token = one instanced
icosahedron, bloom on HDR (`multiplyScalar` while in motion), deterministic seeded
positions, forward-eases / rewind-snaps for scrub safety. Two new files, no new
deps, no shared-component or prior-episode changes (only `ContextMeter2D` gained an
`export` on its `MeterFooter` so the WebGL panel reuses the exact same footer copy):

- **`CondensationCanvas.tsx`** — `buildModel(trace)` tags every particle with
  `arriveFrame`, `compactFrame` (the reads the compaction replaces), `clearFrame`
  (the `session_break` that drains its session), `isSummary`, and a `group` so each
  session fills its own bottom-up strata in the same box. Two tau transitions off
  the cursor: **condense** (`tauC`, cursor ≥ compaction index) and **empty** (`tauB`,
  cursor ≥ break index). Compacted reads converge on a small low ellipsoid, flare
  once, and vanish; the summary particles grow into that same dense block, **dim +
  desaturated grey** (`categoryOf → system`) = the lossy grammar (smaller AND
  duller than what it replaced). At the break every surviving particle rises and
  fades → empty box; session B then refills from scratch.
- **`MemoryContextPanel.tsx`** — the F2 pattern: `supportsWebGL() && !reduced` →
  lazy canvas gated behind `requestIdleCallback`; otherwise `<ContextMeter2D/>`.
  Keeps the CTX token header + legend (adds a "compressed" grey swatch) + shared
  `MeterFooter`. Swapped into `MemoryReplay`'s Context panel.

**Verified in-browser** (build + preview + Playwright, 0 console errors; the only
warnings are three.js's `THREE.Clock` deprecation, present on Ep 1.5/02 too):
peak e12 → box near-full, **CTX 2,225/2,400**; e13 compaction → cyan reads collapse
into a small **grey block**, **CTX 925/2,400**, footer "6 items compressed … −1300";
e16 session_break → **box empty, CTX 0/2,400** while `notes/tokyo-trip.md` persists
in the Memory panel; end e26 → box refilled **CTX 1,425/2,400**, both files present.
Reduced-motion + mobile fallback (→ 2D meter, which already drops at compaction and
clears at the break) is correct-by-construction; formal audit is V4 per brief.
