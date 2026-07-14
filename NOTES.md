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
