# Brief: Episode 02 — "How AI Reads the Web"

Third episode of agent-anatomy. PLAN.md's rules, stack, design system (§6), budgets
(§1), working rules (§11), CLAUDE.md's skill rules, and everything learned in
NOTES.md still bind. Read PLAN.md, EPISODE-1.5-BRIEF.md, and NOTES.md first, then
this. This is a FULL episode — Episode 01's scale, not 1.5's.

## What this episode is

The question everyone asks and nobody has visualized well: when you ask an AI
something it doesn't know, how does it find, read, and cite the web? The reader
watches a real(istic) search-and-answer run: the query forms, the web narrows to
a handful of pages, pages get read (and one *fails* to be read), fragments flow
into the familiar context window, and an answer assembles itself with visible
threads back to its sources.

Audience: the same smart no-background reader — PLUS a second persona this time:
the marketer/site-owner who wants to know why AI cites some pages and not others.
The episode must teach the mechanism honestly first; the "so what for your
website" lands as a natural consequence in the close, never as a sales pitch.

Two jobs:
1. Teach retrieval: why models search, how selection works, what "reading a page"
   actually means, and how citations bind an answer to sources.
2. Third consumer of the trace format — schema 1.2 adds search/fetch/citation
   events. Three episodes, one engine, zero forks: that's the format's proof
   of generality, and the README should say so.

## Schema 1.2 (backward compatible — 1.0 and 1.1 traces must still validate and play)

New event types, all optional:

```ts
| { id: string; type: "search"; query: string; tokens: number;
    results: { sourceId: string; title: string; url: string; snippet: string }[] }
| { id: string; type: "fetch"; sourceId: string; url: string; tokens: number;
    status: "ok" | "unreadable";           // "unreadable" drives the GEO beat
    extracted?: string }                    // the fragment that enters context
```

Plus, on `assistant_message`, optional citations:

```ts
citations?: { spanStart: number; spanEnd: number; sourceIds: string[] }[]
```

And a top-level optional `sources` registry in the trace
(`{ sourceId, title, url, faviconHue }[]`) so panels can render source chips
consistently. Document all of it in docs/trace-format.md with a 1.2 changelog
entry; CI validates everything as always.

## The scenario (decisive)

**"Is it actually safe to reheat rice?"** — a question everyone has googled,
with real stakes, conflicting sources, and a clean authority lesson. The user
asks; the agent doesn't know recent guidance for certain, so it searches.

Beat sheet (~22–28 events):
1. `user_message` — the question.
2. `thinking` — "this is a food-safety question; I should check current guidance
   rather than guess." (Teaches WHY search happens — knowledge isn't live.)
3. `search` — query "reheating rice food safety" → 5 results in the registry:
   a food-safety agency page, a well-structured cooking site, a JS-heavy recipe
   blog, a forum thread, a news article.
4. `thinking` — selection reasoning in plain words: which look authoritative,
   which look thin. Picks three to read.
5. `fetch` agency page → `status: "ok"`, clean extract (spore bacteria survive
   cooking; the danger is rice sitting warm, not reheating itself; cool fast,
   store cold, reheat hot, once).
6. `fetch` cooking site → ok, consistent details.
7. `fetch` recipe blog → **`status: "unreadable"`** — the page renders everything
   with JavaScript; the fetcher gets an empty shell. `thinking`: "I can't read
   this one — moving on." THE GEO BEAT. One event, no lecture; the close
   section cashes it in.
8. `thinking` — synthesis: the two readable sources agree; note the common myth
   (people blame reheating; the real risk is storage).
9. `assistant_message` — a short, correct, useful answer WITH `citations` spans
   pointing at the two read sources.

Copy bar as always: every thinking event readable by a civilian, no jargon.

## Page structure (episodes/how-ai-reads-the-web/)

### S1 — Hero
"When AI doesn't know, what happens next?" Ambient scene continuous with the
series identity. Eyebrow: Episode 02.

### S2 — The cutoff
Small animated figure: a model's knowledge as a sealed archive with a date on
the door. One idea only: models are snapshots; the world moves; search is the
bridge. Link back to Ep 01's context window for new readers.

### S3 — The funnel (pinned, scroll-scrubbed)
The narrowing: a wide field of faint page-glyphs (the web) → ten light up
(results) → three get drawn down (selected) → fragments extracted. Ends with
fragments flowing INTO the familiar glass context window from Ep 01 — same
component, same particle language. Series continuity is the point: readers of
Ep 01 should feel the systems connect.

### S4 — Reading a page
The honest mechanics, small and concrete: a page becomes text, boilerplate falls
away, a fragment survives. Then the counter-example: the JS-only page that
extracts to nothing — render the empty shell visually (a page glyph that opens
to static/blank). One quiet caption: "a page that can't be read can't be cited."
Do not elaborate here; the close owns the implication.

### S5 — The replay (showpiece)
Full Ep-01-style rig, extended: transcript | context window | and the third
panel is now **sources + answer** — source chips light as fetched (the
unreadable one dims out with a small ✕), and when the assistant message arrives,
the answer text renders with **citation threads**: luminous curved lines from
cited spans back to their source chips, drawn on as the answer assembles.
Hovering/tapping a citation highlights its thread and source. **The share clip
of this episode: the answer assembling itself with threads reaching back to
sources.** Compose the autoplay for a clean 15-second recording.

### S6 — Close: "So how do you get cited?"
The PM/GEO payoff, ~150 words, derived entirely from what the reader just
watched: be readable (real HTML, not JS-only shells), be extractable (clear
structure, answers near the top), be authoritative (the agency page won on
substance). No product pitches, no "GEO" jargon dump — name the term once at
most. Then series index: Ep 01, Ep 1.5, Ep 03 slot ("planned"), GitHub, credit.

Landing page: add the 02 card as LIVE (replacing "To be announced"), add an
Ep 03 "planned" slot to keep the series shape.

## Milestones (stop and demo after each)

- **U1 — Schema 1.2 + trace.** Schema changes, the full reheat-rice trace
  (screenplay quality — I will read it as text), sources registry, engine +
  zustand selectors extended for search/fetch/citations, unit tests incl.
  backward-compat tests replaying the 1.0 and 1.1 traces, CI green, docs
  changelog. No UI.
- **U2 — Replay rig extension.** S5's three-panel layout with sources+answer
  panel, citation threads as DOM/SVG overlays, unreadable-source treatment,
  keyboard + mobile tabs, temporary 2D context meter. Fully usable without WebGL.
- **U3 — The funnel + scenes.** S3's narrowing scene (this episode's new WebGL
  work — reuse the particle system; the new choreography is the funnel-to-window
  handoff), S4's page-reading figures, hero ambient. Visual-iteration milestone:
  expect feedback rounds; animation-vocabulary / improve-animations per CLAUDE.md.
  Compose and verify the share-clip recording path.
- **U4 — Copy, polish, ship.** S2 + S6 + all narrative copy (writing-guidelines
  pass; S6 gets an extra editing pass — it must not read as marketing);
  review-animations + web-design-guidelines audit gate; reduced-motion + mobile;
  §1 budgets re-measured on ALL THREE episode pages (no regressions); OG image;
  landing card flip + Ep 03 slot; llms.txt update; README gains Episode 02
  section + citation-threads GIF and the "three episodes, one engine" line;
  docs/launch.md gains the Episode 02 launch section (this one has a second
  audience — include one LinkedIn-appropriate post draft alongside the X thread,
  aimed at the marketing/SEO crowd, clip-first like the others).

## Out of scope
Live search or live LLM calls (the trace is scripted, as always). Episode 03.
Any real brand names in sources — invent plausible neutral ones (e.g. a
".gov-style" food safety agency with a fictional name). Any change to Ep 01/1.5
beyond the landing page and series-index links. New dependencies without
flagging first.
