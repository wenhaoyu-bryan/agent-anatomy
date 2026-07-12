# Build notes — decisions & things tried

Scratchpad for the build. Becomes material for the write-up post later.

## Decisions delegated by PLAN.md → my calls

- **Repo name: `agent-anatomy`.** First of the three candidates and the most
  descriptive — "anatomy" = looking inside how something works, which is the
  whole premise. `trace-theater` and `visible-agents` were the alternates.
- **Display font: Space Grotesk (variable).** Geometric with technical
  personality, pairs cleanly with IBM Plex Mono (the telemetry voice), subsets
  well for self-hosting. Body: IBM Plex Sans. Telemetry/trace text: IBM Plex Mono.
- **Prerendering approach (deferred to M5):** plan to use a minimal build-time
  HTML snapshot rather than an SSR plugin — keeps the Vite setup boring; the only
  requirement is that view-source shows the essay text. Revisit at M5.
- **Package manager: pnpm** — matches the owner's other projects.

## Design-skill workflow contract (owner's rule)

Three tiers, never used simultaneously. PLAN §6 is the binding spec; where a
skill conflicts with §6, the spec wins. Never introduce glassmorphism,
neumorphism, aurora gradients, or off-spec trend styles — if a skill suggests
one, note it here and skip.

1. **Direction** — consult ONLY at M0 (tokens) and M4 (narrative). Named skill
   `frontend-design` is not installed here → using **design-consultation** to
   sharpen §6 execution (not to propose alternatives).
2. **Motion** — consult when writing any animation/transition. Named skills
   `emil-design-eng` / `animation-vocabulary` are not installed → applying §6's
   motion spec directly (mechanical expo/quart-out easing, 200–400ms UI).
3. **Audit gate** — mandatory at end of M3 and M5. Named `review-animations` +
   `web-design-guidelines` not installed → using **design-review** (+
   webapp-testing for visual evidence). Produce findings, fix everything
   severity-medium and up, log findings here, don't close the milestone until clean.

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

### Known deferrals
- favicon.ico 404 on live (harmless console error) → add favicon at M5.
- Font subsets currently include cyrillic/latin-ext; subset to used glyphs at M5.
- Playwright MCP runs in an isolated FS here — screenshots can't be handed back;
  verifying rendering via `document.fonts` + computed styles instead.
