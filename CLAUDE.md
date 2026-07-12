# CLAUDE.md — agent-anatomy

Interactive AI explainer series. Episode 1: "How an AI agent works."
**PLAN.md (repo root) is the binding spec** — read it before changing anything
substantive. NOTES.md is the running decision log; keep it updated.

## Commands

- `pnpm dev` — dev server (base path `/` in dev, `/agent-anatomy/` in prod)
- `pnpm build` — typecheck (`tsc -b`) + vite build (landing + episode pages)
- `pnpm test` — Vitest (headless replay engine)
- `pnpm trace:validate` — validate all `traces/*.trace.json` against the zod schema
- `pnpm schema:build` — regenerate `docs/trace.schema.json` from the zod schema

## Working rules (from PLAN §11)

- Work milestone by milestone (M0–M5, PLAN §10). After each milestone: stop,
  summarize, show how to verify. Do not run ahead.
- Flag conflicts with the brief before substituting anything.
- Replay engine stays pure/headless — zero React imports in `src/trace/`.
- All internal links/assets go through `import.meta.env.BASE_URL`.
- Develop on feature branches; never commit directly to `main`.

## Design-skill rules (owner's contract — binding)

PLAN §6 (flight recorder / mission control telemetry) is the binding design
direction. Where any skill's instincts conflict with §6, the spec wins.

Three tiers, never used simultaneously:

1. **Direction — `frontend-design`**: consult ONLY during M0 (token system,
   done) and M4 (narrative sections). Used to sharpen §6 execution, not to
   propose alternatives.
2. **Motion — `emil-design-eng` / `animation-vocabulary`**: consult whenever
   writing any animation or transition (easing, duration, stagger, spring
   values). These override default motion choices. `improve-animations` may
   additionally be used during M3 iteration.
3. **Audit — `review-animations` + `web-design-guidelines`**: mandatory gate
   at the end of M3 and M5. Produce a findings list, fix everything
   severity-medium and above, log findings in NOTES.md. A milestone is not
   complete until the audit pass is clean. `writing-guidelines` joins the M4
   copy pass.

Hard bans:

- **Never invoke** `ui-ux-pro-max`, `theme-factory`, `canvas-design`, or
  `brand-guidelines` in this project.
- `apple-design` is installed but stays uninvoked.
- Never let any skill introduce glassmorphism, neumorphism, aurora gradients,
  or any trend style not in §6. If a skill suggests one, note it in NOTES.md
  and skip it.
