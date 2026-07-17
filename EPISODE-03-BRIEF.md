# Brief: Episode 03 — "How Agents Remember"

Fourth episode of agent-anatomy. Everything binds as before: PLAN.md (rules, design
system §6, budgets §1, working rules §11), CLAUDE.md skill rules, NOTES.md learnings.
Read PLAN.md, both prior episode briefs, and NOTES.md first. Full-episode scale,
like 01 and 02.

## What this episode is

The resolution of the series' open wound. Episode 1.5's F2 showed the worst moment
in the series: the particles of the original request fading out of a full context
window while the agent kept confidently working. This episode answers it: context
is not memory. Context is what's in the window right now; memory is what gets
deliberately written down OUTSIDE the window so it survives. The reader watches an
agent compact a bursting context into a lossy summary, write durable notes to a
file, run out of session — and then, in a FRESH, EMPTY window, read those notes
back and finish the job.

Core teachings, in order:
1. The window is finite and ephemeral (recap, one breath).
2. Compaction: old context can be compressed into a summary — smaller AND blurrier.
   Compression is lossy. This must be shown honestly, not hand-waved.
3. Memory as artifact: the most reliable memory an agent has is a file it wrote.
   Notes, not neurons.
4. A new session starts empty — and that's fine, if the last session left notes.

Two jobs, as always: teach this to the no-background reader, and be the fourth
consumer of the trace format (schema 1.3), reusing 1.2's search/fetch events to
show the schema composes across episodes.

## Schema 1.3 (backward compatible; 1.0/1.1/1.2 traces must validate and play)

New optional event types:

```ts
| { id: string; type: "compaction";
    replacesEventIds: string[];       // which context items get compressed away
    summary: string;                   // the surviving digest text
    tokensBefore: number; tokensAfter: number }
| { id: string; type: "memory_write"; path: string; content: string; tokens: number }
| { id: string; type: "memory_read";  path: string; content: string; tokens: number }
| { id: string; type: "session_break"; label: string }   // hard reset of the window
```

Engine semantics: `compaction` removes the replaced items from derived context and
inserts the summary as a single condensed item (net token drop = before − after).
`session_break` empties derived context entirely — everything except memory files,
which live in the artifact layer (reuse ArtifactState.files: memory notes ARE files;
no new artifact machinery needed). `memory_read` pulls file content back into
context as a normal context item. Document all of it in docs/trace-format.md with
a 1.3 changelog; CI validates the full trace corpus.

## The scenario (decisive): "Plan a 3-day Tokyo trip" — across two sessions

Relatable, research-heavy, naturally too big for one window at this trace's
(deliberately small) contextWindowTokens.

**Session A (~16–20 events):**
1. `user_message` — "Help me plan a 3-day Tokyo trip in November. I like food
   markets, quiet temples, and I don't want to cram."
2. Research burst reusing 1.2 events: 2 `search` + 3–4 `fetch` calls (neighborhood
   guides, a temple page, a market page — invented neutral sources per the
   Episode 02 rule). The window fills visibly fast — deliberate echo of 1.5's F2
   setup; the reader should feel the dread of recognition.
3. `thinking` — "I'm running out of room. Before I lose the early research, let me
   compress what I've learned and save my notes." (The agent NOTICES — callback to
   the 1.5 thesis: instrumented to notice.)
4. `compaction` — the five big fetch results collapse into one dense summary item.
   tokensBefore ≈ 4× tokensAfter. The summary text must visibly LOSE something
   real (e.g., the fetched pages had specific opening hours; the summary keeps
   "closes early on Wednesdays" but drops the exact times) — honest lossiness the
   viewer can spot.
5. `memory_write` → `notes/tokyo-trip.md` — structured notes: preferences, chosen
   neighborhoods, day-shape sketch, open questions.
6. `assistant_message` — progress report: day 1 drafted, "I've saved my research
   notes; we can pick this up anytime."
7. `session_break` — label "The next day".

**Session B (~10–14 events):**
8. The window is EMPTY. `user_message` — "Let's finish the Tokyo plan."
9. `thinking` — "New session — I don't remember our conversation. Checking my
   notes." (State this plainly; it's the most honest sentence in the series.)
10. `memory_read` `notes/tokyo-trip.md` — the notes flow into the fresh window:
    compact, sufficient, and visibly the SAME file written in Session A.
11. One small `search`/`fetch` for a missing detail (the exact hours compaction
    lost — the lossiness beat pays off: what the summary dropped, retrieval
    recovers).
12. Agent completes days 2–3; final `assistant_message` with the full itinerary
    written to `itinerary.md` (artifact heals — series signature).

## Page structure (episodes/how-agents-remember/)

### S1 — Hero
"What does an AI remember about you? Almost nothing — unless it takes notes."
Ambient scene in the series identity. Eyebrow: Episode 03.

### S2 — The wound (recap)
One compact figure replaying 1.5's eviction moment in miniature (reuse, don't
rebuild), one paragraph: you've seen what happens when the window fills. Link to
1.5 for new readers. End on the question: so how does anything survive?

### S3 — Compaction (pinned, scroll-scrubbed — THE SHARE CLIP)
The signature scene: a crowded context window; then a region of particles draws
together and CONDENSES into a single dense, bright block — visibly smaller,
and rendered slightly blurred/desaturated relative to the crisp originals: the
visual grammar for lossiness. The token meter drops sharply. Caption teaches:
smaller and blurrier — a summary is a trade. Compose the condensation moment for
a clean 15-second recording; this clip ("watch an AI compress its own memory")
is the episode's distribution asset.

### S4 — Notes, not neurons
Small concrete figure: the memory file as an actual file — the window is a glass
box that empties; the file sits OUTSIDE it, persistent, in the artifact panel's
visual language. One idea: the most durable memory is written down. (This is
also quietly your PM thesis again — externalized state beats heroic recall —
but say it in civilian words and don't label it.)

### S5 — The replay (showpiece)
Full rig. The dramatic beat is `session_break`: the context window VISIBLY EMPTIES
mid-replay — every particle gone — while the memory file persists in the artifact
panel. First-time viewers should feel a small "wait, it lost everything?" followed
by the memory_read pulling the notes back in. Timeline renders the two sessions as
two labeled segments. Everything else per the established rig patterns (keyboard,
mobile tabs, DOM meters as fallback).

### S6 — Close: season finale
This completes an arc — say so. Three-sentence recap of the four episodes as one
story (how it works → how it fails → how it reads → how it remembers). Then, in
place of a specific Ep 04 slot, an invitation: "What should be opened up next?
Suggest a topic" → link to a GitHub issue template (create
.github/ISSUE_TEMPLATE/episode-suggestion.md — title, "what confuses people about
this", "what would you want to SEE"). Series index, GitHub, credit.

Landing page: 03 card flips to LIVE; the planned-slot pattern is REPLACED by a
"Suggest episode 04 →" card linking to the issue template — the series stays
alive without promising specifics.

## Milestones (stop and demo after each)

- **V1 — Schema 1.3 + trace.** Schema, engine semantics for compaction /
  session_break / memory read-write, the complete two-session Tokyo trace
  (screenplay quality — I read it as text first), backward-compat tests across
  the whole trace corpus, CI, docs changelog. No UI.
- **V2 — Replay rig.** Two-session timeline, the session_break window-empty
  behavior, memory file rendering in the artifact panel, compaction rendered in
  the transcript and context meter (2D fallback first). Fully usable without WebGL.
- **V3 — The condensation scene.** S3's particle compaction + S5's window-emptying
  moment in WebGL. Visual-iteration milestone — expect rounds; the lossy-blur
  treatment on the condensed block is the detail to get right. Verify the
  share-clip recording path.
- **V4 — Copy, polish, ship.** S2/S4/S6 + all narrative copy (writing-guidelines
  pass); audit gate (review-animations + web-design-guidelines); reduced-motion +
  mobile; §1 budgets re-measured on ALL FOUR episode pages, no regressions; OG
  image; landing updates + issue template; llms.txt; README gains Episode 03 +
  the condensation GIF + "four episodes, one engine" line; docs/launch.md gains
  the Episode 03 section (clip-first thread; angle: "your AI doesn't remember
  you — here's what it does instead").

## Out of scope
Episode 04. Live LLM calls. Real product names for memory systems (no vendor
comparisons — mechanism only). Vector databases / embeddings (a one-line "some
systems also search their notes by meaning" aside is allowed in S4 at most;
teaching RAG internals is a future episode, not a paragraph). New dependencies
without flagging. Changes to prior episodes beyond the S2 reuse and index links.
