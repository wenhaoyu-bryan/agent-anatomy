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

### V4 — copy, polish, ship (this milestone)

The four missing narrative sections + the peripheral ship work.

- **S2 — the wound recap** (`WoundRecap.tsx`, DOM). Replays 1.5's F2 eviction in
  miniature using the **2D context-meter's visual grammar** (a full stacked window
  with the oldest band — the original request — faded out the bottom, tagged "✕
  evicted") rather than a second WebGL canvas. Flagged tradeoff: the page already
  runs three canvases (hero + S3 + S5); a fourth would cost budget/TBT for a still
  the DOM tells cleanly. Ends on the question the episode answers ("so how does
  anything survive a window that keeps emptying?") + a link to Ep 1.5.
- **S3 — the compaction share-clip** (`CompactionCanvas.tsx` + `CompactionSection.tsx`).
  The brief's named distribution asset, built as a **dedicated CSS-sticky pinned,
  scroll-scrubbed** section (the Ep-02 FunnelSection pattern), NOT re-driving the
  working S5 canvas — lower regression risk. Self-contained: ~520 colored "read"
  particles fill the box bottom-up over progress 0→0.42, hold, then over 0.5→1
  draw down, flare once, and collapse into ~132 dim/desaturated **grey** summary
  particles (~4× smaller) — the lossy grammar. Everything is a **pure function of
  scroll progress** (no persistent state), so scrubbing back just re-evaluates;
  flare is 1.0 at rest so nothing blazes pre-condense. The DOM keeps a token
  readout that drops **2,225 → 925** in sync + an `sr-only role=status`. Shares the
  box/BLOCK/particle grammar with S5's `CondensationCanvas` so the two scenes read
  as one system. Reduced-motion / no-WebGL / SSR → a compact static before/after
  figure (crowded window → small grey block), no tall scroll area.
- **S4 — notes, not neurons** (`NotesFigure.tsx`, DOM). A glass context-window box
  (emptied) beside a persistent `notes/tokyo-trip.md` file card in the Memory
  panel's language ("outlives →"). The PM thesis in civilian words; the one-line
  "search notes by meaning" aside is the single allowed RAG nod (brief cap).
- **S6 — season finale** (`Episode03.tsx` Close). Reframed to "Season finale /
  Four episodes, one story" with the three-ish-sentence arc recap (works → fails →
  reads → remembers). The planned-slot pattern is replaced by a **"What should we
  open up next?" card** → a GitHub issue template
  (`.github/ISSUE_TEMPLATE/episode-suggestion.md`: topic / what confuses people /
  what would you want to SEE). Landing: Ep 03 card flipped **LIVE**, and a new
  clickable dashed **"04 · Suggest a topic"** card (new `status:"suggest"` variant).
- **Ship**: OG card `public/og/episode-03.png` (1200×630, the condensation motif +
  "CTX 2,225 → 925 · COMPACTED", built from an HTML card served over http with the
  @fontsource woff2 copied in, screenshotted — the meta was already wired in V2);
  README gains an Episode 03 section + `docs/media/compaction.gif` (760×486, 388 KB,
  6 real frames captured off the S3 canvas across the scrub, ffmpeg two-pass
  palette) + the "four episodes, one engine" line; `llms.txt` gains the Ep 03
  summary + page link + the 1.3 schema line + "Four episodes"; `docs/launch.md`
  gains a fourth-launch (season-finale) section — clip-first X thread, angle "your
  AI doesn't remember you — here's what it does instead", + the compaction-clip
  recording recipe.

Audit gate (review-animations + web-design-guidelines + writing-guidelines): the
tier-3 skills still don't register in this session (consistent with every prior
milestone) — ran the checklists manually. **No severity-medium-or-above findings.**
- Motion: S3 is deterministic + scrub-safe (pure fn of progress), flare 1.0 at rest,
  bloom threshold 1, frameloop `never` off-screen (IntersectionObserver), CSS-sticky
  pin (no scroll-jacking), reduced-motion → static figure. Caption uses the reused
  360ms one-shot, not a perpetual loop.
- Web/a11y: h1→h2 order kept; new sections carry `aria-labelledby`; canvas is
  `aria-hidden` with an `sr-only role=status` token readout; decorative figures
  `aria-hidden`; palette strictly §6 (the lossy grey is `--color-muted`, no new
  colors); color never the sole signal (token readout + captions are text);
  text-balance on new h2s; suggest links covered by the global focus-visible ring.
- Writing pass: copy is active, sentence-case, hedge-free; em dashes stay (house
  voice). Fixed two straight apostrophes in visible prose → curly (landing suggest
  blurb, Ep 1.5 series blurb). The `notes/tokyo-trip.md` `<pre>` keeps straight
  apostrophes on purpose — it's raw file content and matches the trace's own style.

Reduced-motion + mobile verified: the prerendered ep03 HTML (= the no-JS/reduced
path) contains the S3 static figure + the wound/notes/finale DOM and **no `<canvas>`**;
mobile 390×844 has no horizontal overflow (scrollWidth == 390), the S3 heading wraps
with the CTX readout tucked top-right, the box fits, replay tabs + 3 canvases render.

§1 budgets re-measured (gzip of the exact chunks each page loads, all lazy canvases
triggered): **ep03 412.8 KB**, **ep1.5 407.2 KB** (the hero fix adds ~1 KB — three
was already pulled by EvictionCanvas), ep01/ep02 untouched by the episode changes
(ep02 was 401). All four under the 450 KB gz budget. 63 tests green, 7 traces
validate, CI body-grep sentinel present. **Episode 03 is feature-complete.**

### Cross-cut bug fix — Ep 1.5 hero had no ambient (committed separately, d6603be)

Owner spotted that 01/02/03 heroes animate (the drifting particle field + loop
motif) but 1.5's is static. Verdict: **not intentional** — the brief asks for the
"same identity" with a darker mood; 1.5 shipped static only because the reusable
`HeroAmbient` didn't exist yet when it was built (introduced later in Ep 02), and it
was never retrofitted. Fix: added `<HeroAmbient />` under the existing vignette (mood
preserved). Verified live: hero canvas mounts (2100×1431), 0 console errors, budget
still 407 KB.

## Episode 04 — "How Agents Work Together" (full episode; brief in the session prompt)

Milestones W0–W4. Feature branch `feature/episode-04` (off `docs/project-overview`,
so W0 can edit PROJECT-OVERVIEW.md). Split the job: one lead agent breaks a too-big
task into pieces, hands each to a helper with its own small fresh window, and
composes their summaries. Schema 1.4 adds parallel lanes.

### W0 — consistency fixes from PROJECT-OVERVIEW.md (this milestone)

Folds the audit findings in *before* the series grows, so Episode 04 doesn't
compound them. Kept as separate concerns; prior-episode behaviour otherwise
untouched (the whole corpus still validates and plays).

- **A1 — Ep 02 palette breach fixed.** Removed per-source `faviconHue` colouring
  from `SourcesAnswerPanel.tsx`. Source chips are now neutral panel chips with a
  small document glyph (cyan when read, muted otherwise), told apart by their
  label/url; the read/unread state carries in the border + `read`/`✕ unread`/
  `found` micro-label, not a hue. Citation threads (underlay + drawn stroke) are
  `var(--color-tool)` signal cyan only; the cited-span hover highlight is a cyan
  underline. Hover/focus a citation still isolates its thread group (the thread →
  source mapping). No `boxShadow` glow on chips (was `0 0 6px hue`) — §6 keeps
  bloom in WebGL only. Result: the whole series is inside the fixed §6 palette.
  `faviconHue` deprecated in `schema.ts` + `docs/trace-format.md`, kept required
  for back-compat (no renderer reads it); traces + `trace.schema.json` unchanged.
- **A2 — Ep 02 layout fixed.** `ReadingReplay.tsx` is back on the shared 3-across
  grid `md:grid-cols-[1.15fr_0.85fr_1fr]` (transcript | context | sources+answer),
  dropping the 2-over-1 split. The sources panel is now a fixed-height scrolling
  column like the others; the panel's internal layout stacks sources-over-answer
  (was `md:flex-row-reverse`), so citation threads arc *up* the column from each
  cited span to its chip. Threads are measured relative to the panel container,
  which scrolls with its content, so the arcs stay aligned when the column
  scrolls. Mobile tabs unchanged.
- **A3 — Ep 1.5 hero voice fixed.** On-page H1 `Episode15.tsx`: "Where agents go
  wrong" → "What happens when the loop goes wrong?" (matches the 01/02/03
  interrogative hero voice). The subline ("Episode 01 showed the loop working. It
  doesn't always.") still reads. Page `<title>` + `og:title` in
  `episodes/where-agents-go-wrong/index.html` left as "Where agents go wrong" so
  already-shared URLs keep their previews. CI body-grep sentinel is "Two ideas
  carry this episode" (unaffected).
- **A4 — documented, not changed.** Series interaction rule stated in NOTES +
  PROJECT-OVERVIEW: **concept scenes are scroll-scrubbed; replays are
  player-driven** (deliberate, per PLAN's mobile decision). Not an
  inconsistency — a rule a viewer learns once: teaching marquees advance with
  scroll; the transport-driven replay never ties to scroll.

Verified (build → preview → Playwright): 63 tests green, 7 traces validate,
schema diff clean, build prerenders all 5 pages. Ep 02 replay played to the end —
grid `429:317:373px` (the 1.15:0.85:1 ratio), 3 citation threads all cyan
`#5CCFE6`, chips cyan-when-read / muted otherwise (zero per-source hues), 0
console errors; mobile 390px no overflow, 3 tabs one-at-a-time. Ep 1.5 H1 is the
new question; `<title>`/`og:title` unchanged. Budgets ~370–375 KB gz on 01/1.5/02
(only the ep02/ep15 entry chunks changed, both smaller). Committed on
`feature/episode-04` (3 commits). Demo shown.

### W1 — schema 1.4 + the party trace (this milestone)

Schema bumped to **1.4**, backward compatible (1.0–1.3 all validate/render
unchanged; a dedicated test re-validates all seven prior traces and asserts their
versions are untouched). This is the format's biggest structural test — parallel
lanes — so the fold is now per-agent while staying identical for single-agent
traces.

Additions, all optional:
- **top-level `agents` registry** `{ agentId, name, contextWindowTokens }[]` — each
  helper has its own small window. The lead is implicit (`agentId: "lead"`, window
  = `meta.contextWindowTokens`) and may NOT be declared.
- **`agentId?` on every event** (added to `eventBase`) — whose window it belongs
  to, default `"lead"`.
- **`agent_spawn`** `{ spawnedAgentId, task }` and **`agent_result`** `{ summary }`.

**Token routing (the crux).** `windowOwner` ≠ the acting agent for the two new
types: a **spawn seeds the HELPER's window and resets it** (fresh brief, so a
re-brief clears the first attempt), and is NOT charged to the lead — that's how
delegation keeps the lead light. A **result lands in the LEAD's window** as one
condensed item (Ep 03's lossy-digest grammar), not the reporting helper's. Every
other event lands in its own agent's window.

**Schema fold (superRefine) is now per-lane.** One `{ window, running, live }`
lane per agent; eviction/compaction/session_break operate on the owner lane;
`0 ≤ running ≤ window` is checked per lane. For a trace with no `agents` this is
exactly the old single-lead fold (why all 63 prior tests passed untouched). New
integrity rules: referenced agent ids must be declared + unique; `"lead"` can't be
declared; only the lead spawns; a helper can't act/report before it's spawned;
can't spawn the lead; a helper window overflow is an error.

**Engine** (`replay.ts`): per-lane derivation, `frame.lanes: LaneState[]` (lead +
helpers, stable set, helpers empty until spawned) + `frame.activeAgentId` (the
lane whose window changed — spawn→helper, result→lead). `contextItems`/`tokensUsed`
still = the LEAD lane, so shared components are unchanged. World state (artifact
files, source registry) stays global across agents. `LEAD_AGENT_ID` exported.
Exhaustive `event.type` sites updated (as every bump): `eventMeta.ts` (SPAWN cyan /
REPORT muted + `eventBody`), `palette.ts` (agent_spawn→tool cyan, agent_result→
system grey = the lossy-digest colour).

**`validate-traces.ts`** now reads per-lane peaks straight off the engine frames
(no re-implemented fold), reporting the lead peak + the tightest helper lane.

**The trace** (`traces/plan-birthday-party.trace.json`, 28 events, v1.4, lead
window 2400, 3 helpers × 1400): "Plan a surprise 30th birthday." Lead splits into
VENUE / FOOD / INVITES briefs (the "center of attention" detail deliberately
withheld from FOOD — the plant), three lanes fill in interleaved parallel, VENUE's
first pick is over budget (the snag → lead re-briefs it, fresh window), FOOD's
result surfaces a surprise-spoiling gong-announcement *because* its brief lacked
the detail (lead catches it against the original ask), revised VENUE lands, lead
composes `party-plan.md` (artifact heals) + a final answer with NO citations (the
lead composes from summaries, never the helpers' sources — thematically honest).
Lanes: lead peak **1090/2400**, VENUE **730/1400**, FOOD 630, INVITES 230 — three
small healthy windows where one would have drowned. Engine + validator agree on
every number.

Tests: **83 green** (was 63; +12 schema for 1.4 rules + backward-compat, +8 engine
for lane derivation). 8 traces validate. `schema:build` regenerated + idempotent
(CI git-diff will pass). Full build green (5 pages prerender — the Episode 04 page
is W2). Demo = read the party trace as a screenplay.

**Concurrency model, documented honestly** (docs/trace-format.md): events are one
flat, globally ordered array; "parallel" lanes are a presentational projection —
the engine folds in file order, nothing runs at the same literal instant, which is
also roughly true of a real multi-agent system's merged log.

### W2 — the lane replay rig (this milestone)

New page `episodes/how-agents-work-together/` (`src/episode04/`), wired like Ep 02/03:
`vite.config` input + `entry-server.renderEpisode04` + `prerender.ts` inject + a
body-only CI grep ("its own small, fresh window"). Hero + the S5 **lane replay** +
a minimal series-index close; the S2 recap, S3 fan-out scene, S4 handoffs figure,
and full S6 come in W3/W4 (the U2/V2 pattern).

**Shared rig, extended (backward compatible — all prior episodes unregressed).**
The whole point of W0 was one shared rig; W2 keeps it, teaching the two shared
components about lanes:
- **`TranscriptPanel`** — dimming now keys off the union of ALL lanes'
  `contextItems` (was just `frame.contextItems`), so a helper's events aren't
  falsely dimmed, and venue's first-attempt events correctly dim after the
  re-brief resets its window. A small per-lane **tick** badge marks helper work
  (`→ VENUE` on a spawn, `VENUE →` on a result, `VENUE` on the helper's own
  events); helper-internal events indent (`ml-4`) to read as a sub-lane. New
  `EventText` for `agent_spawn` (the brief, cyan-ruled = the helper's whole
  starting context) and `agent_result` (the summary, muted/italic = a lossy
  digest). Prior traces have no `agents`, so no ticks/indents appear — verified
  Ep 01 transcript renders 20 rows, 0 ticks.
- **`Timeline`** — optional `markers?: {index,label}[]` prop renders small
  clickable flags above the strip (seek on click), positioned by event fraction.
  No prop = unchanged for every prior episode.

**New Episode-04 components (`src/episode04/`):**
- **`LaneMeters`** — the context panel is now a grid of windows (lead + 3
  helpers) off `frame.lanes`. Each cell: name, a stacked bar (event-type colours,
  per-lane width), `CTX used/window`, fill %. The lane the current event changed
  (`frame.activeAgentId`) gets the one cyan accent (border + ring + faint panel
  bg); helpers show "waiting for a brief…" until spawned. **No per-lane hue** —
  lanes are told apart by name + grid position (the W0 lesson, not repeated).
  Desktop 2×2; mobile a lane switcher that follows the active lane.
- **`PlanPanel`** — the third panel; the artifact heals here (`party-plan.md`
  appears when the lead composes it), MemoryPanel's file-card grammar.
- **`LaneReplay`** — the S5 rig: shared `Controls`/`Timeline`(+markers)/
  `LoopIndicator`/`TranscriptPanel`, 3-across `md:grid-cols-[1.15fr_0.85fr_1fr]`
  (Transcript | Context windows | The plan), mobile tabs. Markers resolved by
  event id: e16 "over budget" (the snag) + e21 "re-brief" (the adaptation).

**Verified in-browser** (build → preview → Playwright, 0 console errors; 1 warning
= three.js `THREE.Clock`, series-wide): mid-run (e15) the four windows read
**Lead 210/2400 · VENUE 730/1400 · FOOD 630 · INVITES 230** filling in parallel;
end reads **Lead 1090** (holds the summaries), **VENUE 440** (re-brief reset),
`party-plan.md` composed. Active-lane highlight lands on VENUE at e07 (cyan border,
after the 300ms transition). Both timeline markers present + clickable. Mobile
390px: no overflow, replay tabs (Transcript/Windows/The plan) + lane switcher
(Lead/VENUE/FOOD/INVITES), one panel at a time. Prerender ships hero + replay text
and **no `<canvas>`** (the no-JS/reduced path). Ep 01 unregressed.

§1 budget: ep04 chunk **7.8 KB gz**, per-page ≈ **364 KB gz** (global + three.js +
demoStream + episode04 + HeroAmbient + lazy scroll) — under 450, the lightest
WebGL page since it has no dedicated scene yet. **W3's fan-out canvas is the flagged
budget risk** — measure it early. 83 tests green, 8 traces validate, all 6 CI
sentinels pass, full build green (6 pages prerender). Demo = play the Episode 04
replay end-to-end.

### W3 — the fan-out scene + handoffs figure (this milestone)

The visual-iteration milestone: S3's WebGL bloom-and-parallel-fill (the share
clip) and the S4 handoffs figure, wired into the page between the hero and the
replay (Hero → S3 → S4 → S5 → close). Interaction rule honored (W0/A4): S3 is a
concept scene → **scroll-scrubbed**; the S5 replay stays player-driven.

- **`FanOutCanvas.tsx`** — a dedicated in-flow `<Canvas>` (the Ep 02/03 precedent,
  NOT the tracked-overlay slot machinery), structurally a sibling of
  `CompactionCanvas`: instanced icosahedra, selective bloom (`luminanceThreshold
  1`, HDR flare on arrival), box + `Edges` (§6), everything a **pure function of
  scroll progress** so scrubbing back just re-evaluates. Three phases: task
  (0–0.18) — three briefs clustered bright in the lead window; split (0.18–0.40) —
  they fly out on bezier arcs to three helper windows that **bloom in** (group
  scale 0→1, staggered per lane); fill (0.40–1) — each helper window fills
  bottom-up across its own span with a **distinct rhythm** (VENUE first/fastest/
  fullest 92 particles, FOOD 78, INVITES 48 — mirroring the trace's 730/630/230).
  **No per-lane hue** — particles keep the event-type palette (cyan/amber); lanes
  differ by position + rhythm (the W0 lesson). The fan-out canvas chunk is only
  **2.0 KB gz** — it reuses the already-loaded three.js/SceneA + Edges + Bloom.
- **`FanOutSection.tsx`** — CSS-sticky pinned (320vh), rAF-throttled scroll→
  progress ref, `useGlReady()` gate, IntersectionObserver frameloop gating.
  3 DOM stage captions (One job / Splitting / In parallel) + a "1 → 3 windows"
  readout + `sr-only role=status`. Reduced-motion / no-WebGL / SSR → a compact
  static before/after figure (one window's task → three part-full windows), no
  tall scroll area.
- **`HandoffFigure.tsx`** (S4, DOM) — a helper's full crowded window vs. the one
  small, greyed, **softened** (blur + desaturate) block the lead receives, reusing
  Ep 03's lossy grammar. The PM sentence in civilian words: "The lead never sees
  the work — only the report … you keep the gist and lose the detail — until the
  detail that got dropped was the one that mattered."

**Verified in-browser** (build → preview → Playwright, 0 console errors; 2 warnings
= three.js `THREE.Clock`, series-wide): the fan-out canvas mounts and **renders
~1,500 draw calls/sec while in view, 0 off-screen** (IntersectionObserver gating
works, §8). Scrubbing scroll drives the three phases cleanly (p 0.04 → "One job /
1 window", 0.30 → "Splitting / 1 → 3 windows", 0.72 → "In parallel / 3 windows").
Prerender ships the S3 + S4 copy and **no `<canvas>`** (reduced-motion/no-JS path).
Mobile 390px: no horizontal overflow anywhere down the page; S3 + S4 present.

**Budget risk resolved.** ep04 per-page ≈ **375 KB gz** (FanOutCanvas adds ~4 KB
net over W2 — 2 KB canvas + 2 KB episode chunk — because three.js was already
pulled by HeroAmbient). Well under 450. 83 tests, 8 traces, all 6 CI sentinels,
build green (6 pages prerender).

**Share-clip recording path verified** — the scene is deterministic, scrub-safe,
and loopable, so a straight screen recording of the fan-out needs no editing. The
actual 15-sec capture is owner-machine-only (headless RAF can't wall-clock-sample
eased motion) — same launch-blocking status as the other four clips, per
docs/launch.md; the W4 launch section documents the recipe.

---

## Episode 04 · W4 — copy, polish, ship (season-one close)

The last milestone: the two remaining narrative sections, the audit gate, the
budget re-measure across all five pages, and every ship-time asset.

**Copy — the two missing sections.**
- **S2 recap** (`Episode04.tsx` → `Recap`, between Hero and the fan-out): "The
  problem so far / One window, and it keeps filling up." Frames delegation as the
  series' *third* way out of the finite window, next to Retrieval (Ep 02) and
  Memory (Ep 03) — three cards, Delegation the cyan-accented "this episode." Ties
  Ep 04 back into the season spine instead of standing alone.
- **S6 close** was already built in W2/W3 (`Close`: series index with 04 "You are
  here", the 05 suggestion card, "Five episodes, one engine"); W4 only reworded
  the open-source card ("Five different runs …").

**Writing-guidelines pass** (fetched fresh). Applied the non-conflicting rules,
consciously kept house style where the two Vercel guides fight §6:
- Kept — em dashes (the series' signature punctuation) and the rhetorical-question
  hero ("Why would an AI need a team?", matching Ep 1.5's W0 rewrite). These are
  the established voice; §6/house voice wins over the skill (CLAUDE.md).
- Fixed — banned filler in shipped UI copy: `FanOutSection` S3 caption "It's
  really three jobs" → "That one job is three …"; `Close` "Five very different
  runs" → "Five different runs". "just" hits were all in code comments (out of
  scope). Marketing "just watch" in launch.md kept (that file's tweet voice).

**Web-design audit** (web-interface-guidelines, fetched fresh). Clean except one
medium: the lane-meter CTX/`%` readouts update per-event but weren't tabular →
digit jitter. Fixed with `tabular-nums` on the two `LaneCell` spans (scoped to
Ep 04, not the shared `.micro-label`). Everything else already covered site-wide:
`:focus-visible` ring is global (`global.css`), the `prefers-reduced-motion` reset
is global, the mobile lane switcher is a real `role=tablist` of native buttons
with `aria-selected`, each lane bar carries a `role=img` + descriptive
`aria-label`, headings are one-H1-then-ordered-H2, empty lanes render "waiting for
a brief…" (proper `…`). Timeline snag-markers (W2) are text-label buttons (not
icon-only), so no `aria-label` needed.

**Animation review** (manual review-animations read; motion was authored under the
emil-design-eng tier in W2/W3). No medium+ findings: reveals animate only
opacity/transform, the fan-out is a pure function of scroll progress (interruptible
by nature, frameloop gated by IntersectionObserver, and behind `useGlReady` which
excludes reduced-motion → static fallback), caption cross-fade re-keys per stage.
The lane-bar `transition: width 300ms` is non-compositor but is the exact house
context-meter pattern shared by all five episodes — kept for consistency.

**Budgets re-measured** (initial JS, script src + modulepreload, gzipped, off the
real `dist` HTML). All under the §1 450 KB ceiling:
`landing 61.1 · 01 90.0 · 1.5 343.1 · 02 345.1 · 03 346.4 · 04 343.8 KB gz`.
Ep 04 came in at **343.8** — a touch *leaner* than 02/03 (the W3 "≈375" was a
conservative estimate; the actual modulepreload set is smaller). W4's new DOM
sections add no measurable weight.

**Ship assets.**
- **OG image** `public/og/episode-04.png` (1200×630, on-brand): built a
  self-contained HTML with the embedded site fonts (Space Grotesk + IBM Plex
  Mono), screenshotted at exactly 1200×630. Same grammar as Ep 03's card —
  telemetry grid, kicker, big display H1, mono subtitle, bottom status line
  ("TEAM 1 lead → **3 helpers** · IN PARALLEL"), right-side bordered viz showing
  the LEAD window fanning via three cyan bezier arcs into VENUE/FOOD/INVITES
  helper windows filling bottom-up. Already wired in the episode `<head>` (W2).
- **Landing** (`Landing.tsx`): 04 flipped from the old suggestion slot to a LIVE
  card → the episode; a new 05 card carries the "What should we open up next?"
  suggestion (Open). Verified in-browser: 01–04 LIVE, 05 Open.
- **llms.txt**: Episode 04 paragraph (the birthday-party delegation run: snag +
  spoiler-catch + re-brief), the 1.4 schema note (agents registry + per-event
  `agentId` + `agent_spawn`/`agent_result`), the Pages entry, "Four → Five
  episodes."
- **README**: full Episode 04 section (fan-out / handoffs-are-summaries / replay,
  the 1.4 schema paragraph, `docs/media/fan-out.gif` hero — *GIF still to be
  recorded, owner-machine*), tagline moved to "**Five episodes, one engine**";
  Ep 03's "season finale / Four episodes" framing softened.
- **docs/launch.md**: Episode 04 launch section — angle "watch an AI split itself
  into a team," 4-post X thread + LinkedIn (the "what is multi-agent, really?"
  cut) + optional season-one Show HN wrap + the fan-out clip recipe (S3 pinned
  scene, deterministic/scrub-safe).

**Verified** (build → preview → Playwright): `tsc` + build green, all **6 pages
prerender** (incl. landing), **83 tests**, **8 traces validate** (birthday-party:
lead peak 1090/2400 · 3 helpers, tightest VENUE 730/1400), **0 console errors**,
Recap + fan-out + landing cards render correctly, OG resolves to episode-04.png.

**Not done / owner-machine (launch-blocking, same status as all prior clips):**
the fan-out share GIF (`docs/media/fan-out.gif`) and OG-free video capture — a
headless RAF can't wall-clock-sample eased/scroll motion; recipe is in launch.md.

**Episode 05 deliberately left off the site** (owner instruction). The landing 05
card is only the open "suggest a topic" slot; no episode-05 page, route, or trace
exists. Season one = five shipped episodes (01, 1.5, 02, 03, 04).

## Analytics (GoatCounter) — pre-launch

- **Shared account, path-scoped.** Site code `bryanyu.goatcounter.com` — the same
  code the portfolio uses; all properties share one dashboard, separated by path.
- **Path integrity under the base path.** GoatCounter's default reports
  `location.pathname`, which already carries `/agent-anatomy/…`, but to remove any
  ambiguity (trailing-slash normalization, base-path quirks) each page hardcodes
  its full real path via `window.goatcounter = { path: "…" }`. So the landing
  reports `/agent-anatomy/` and each episode its own
  `/agent-anatomy/episodes/<slug>/` — never collapsed to `/`, never base-stripped,
  and always distinct from the portfolio's own paths (`/`, `/projects/…`) in the
  shared dashboard.
- **Off the critical path.** The official `//gc.zgo.at/count.js` loads `async` and
  is external (not bundled), so it never joins the render-blocking chain and does
  **not** count against the 450 KB per-page episode JS budget.
- **Prerender coverage: kept, not skipped.** The tags sit in each source
  `index.html` `<body>`; prerender only swaps the `<div id="root">` marker, so the
  script survives into the prerendered HTML untouched — no-JS/prerender visits are
  counted whenever the script itself loads.
- **Privacy:** no cookies, no consent UI, no fingerprinting extras — GoatCounter's
  default privacy behavior.

## Releases

Releases intentionally absent (owner decision, 2026-07). Revisit and cut the first
release — at the then-current schema version — when the trace format gets its first
external adopter: a third-party trace file, a meaningful fork, or a schema-stability
issue.
