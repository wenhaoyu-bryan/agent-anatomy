# Brief: Episode 1.5 — "Where Agents Go Wrong"

Continuation of the agent-anatomy project. PLAN.md's rules, stack, design system (§6),
budgets (§1), and working rules (§11) all still bind. This brief only defines what's
new. Read PLAN.md and NOTES.md first, then this.

## What this episode is

The fast-follow promised on the landing page: "Context overflow, wrong turns, dead
ends — and how agents recover." It is deliberately smaller than Episode 01 — a tight,
darker companion piece, not a second epic. Target length: roughly 60% of Episode 01.

Two jobs:
1. **Teach failure modes** to the same no-background-needed reader who finished Ep 01.
2. **Prove the trace format generalizes.** Ep 01 shipped a schema and claimed "the
   engine renders any trace." This episode is the second consumer of that claim —
   three new trace files, same engine. If the engine needs changes to render failure,
   that's the schema earning its version bump in public, which is good OSS storytelling.

## The three failure modes (decisive — one mini-replay each)

Each is a SHORT trace (8–14 events), rendered by the existing replay components in a
compact single-panel or two-panel layout (not the full three-panel S4 rig — these are
vignettes, not the showpiece).

### F1 — The loop trap
The agent tries the same failing action repeatedly. Scenario: it edits a file, the
change doesn't take effect (it's editing a copy, not the served file), re-renders,
sees no change, edits again... The transcript panel visually rhymes — near-identical
event pairs stacking up — while the context meter climbs with every futile cycle.
Teaching line: agents don't get frustrated; they get *expensive*. The loop indicator
from Ep 01 spins uselessly. End the trace mid-loop (no rescue) — the discomfort is
the lesson.

### F2 — Context overflow (the centerpiece + share clip of this episode)
Reuse the particle context-window scene. The agent reads too many large files while
investigating; the window fills to the brim, and then the oldest particles visibly
FADE/EVICT out the bottom as new ones arrive — including the particles representing
the original user request. Then the agent, having literally lost the plot, does
something confidently wrong (answers a question that's no longer the one asked).
This eviction moment — early memories dissolving while the agent keeps working —
is the 15-second clip for this episode. Compose it deliberately.

### F3 — The bad observation + recovery (the redemptive one)
A tool returns something misleading (a stale cached render says the page is fine
when it isn't). Agent starts down the wrong path — then a verification step
(re-reading the actual file instead of trusting the cache) catches it, the agent
backtracks, and finishes correctly. This is the only trace with a happy ending,
and it carries the episode's thesis: **good agents aren't the ones that never err —
they're the ones instrumented to notice.** This is also where the PM voice lands:
one short closing passage on why harnesses, verification steps, and milestone gates
exist (without ever using the word "harness" — describe the behavior, not the jargon).

## Schema changes (minimal, versioned)

Extend to `version: "1.1"`, backward compatible — 1.0 traces must still validate and
render. Additions, all optional:
- `context_evicted` event `{ id, type: "context_evicted", evictedEventIds: string[], tokens: number }`
  — drives the F2 particle fade-out.
- Optional `annotation?: string` on any event — an authorial voice-over the UI renders
  as a small margin note (used sparingly: e.g. "same call, third time" in F1).
Document the 1.1 additions in docs/trace-format.md with a changelog section. CI
validates all five trace files (two old, three new).

## Page structure (episodes/where-agents-go-wrong/)

1. **Hero** — darker mood than Ep 01's hero within the same identity (§6 palette,
   no new colors). Title: "Where agents go wrong." One-line setup: "Episode 01 showed
   the loop working. It doesn't always."
2. **30-second recap** — the loop + context window in one compact animated figure for
   readers who skipped Ep 01, with a link back.
3. **F1 vignette** — loop trap.
4. **F2 vignette** — overflow, pinned scroll section like Ep 01's S3.
5. **F3 vignette** — bad observation + recovery.
6. **Close** — the thesis passage (agents instrumented to notice), then series index:
   Ep 01 link, Ep 02 "planned" slot, GitHub, credit.

Landing page: flip the 1.5 card from IN ASSEMBLY → LIVE with link, keeping the card
component unchanged. Ep 01's S3 foreshadow line ("what happens when it fills up?")
becomes a link to this episode.

## Milestones (smaller than Ep 01's — pipeline already exists)

- **T1 — Traces + schema.** The 1.1 schema changes, all three trace files fully
  written (they are screenplays — same copy bar as before), engine + tests updated,
  CI green, docs updated. Stop and demo: I will read the traces as text.
- **T2 — Page + vignettes.** Episode page with all sections, F1/F3 replays working,
  F2 with a temporary 2D meter. Recap figure. Stop and demo.
- **T3 — The eviction scene.** F2's particle overflow + eviction, composed for the
  15-second recording. This is the visual-iteration milestone: expect feedback rounds;
  use animation-vocabulary / improve-animations per CLAUDE.md. Stop and demo.
- **T4 — Copy, polish, ship.** writing-guidelines pass on all copy; review-animations
  + web-design-guidelines audit gate; reduced-motion + mobile pass; §1 budgets
  re-measured on BOTH episode pages (Ep 01 must not regress); OG image for the new
  page; landing card flipped to LIVE; llms.txt updated; README gains an "Episode 1.5"
  section + eviction GIF; docs/launch.md gains a second-launch section (X thread for
  1.5, framed as "the failure-modes sequel").

## Out of scope
Episode 02. Any live LLM calls. Any change to Episode 01's sections beyond the S3
foreshadow link. Any new dependencies (the existing stack covers everything here —
flag it if you disagree before adding anything).
