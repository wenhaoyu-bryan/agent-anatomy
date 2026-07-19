# Trace format

Current version: **1.3** (backward compatible — every 1.0, 1.1, and 1.2 trace
still validates and renders unchanged). See the [changelog](#changelog).

A **trace** is a JSON file describing one complete, scripted agent run: what the
agent was asked, what it thought, which tools it called, what came back, and how
the world changed. The replay engine renders any trace that fits this schema.

The format deliberately mimics the *shape* of real agent transcripts (system
prompt → user message → thinking → tool calls → results → answer), so real
session logs can be adapted into traces.

- **Machine-readable schema:** [`trace.schema.json`](./trace.schema.json)
  (generated from the zod source of truth in
  [`src/trace/schema.ts`](../src/trace/schema.ts) via `pnpm schema:build`)
- **Complete example:** [`traces/fix-broken-page.trace.json`](../traces/fix-broken-page.trace.json)
- **Web-retrieval example (v1.2):** [`traces/reheat-rice.trace.json`](../traces/reheat-rice.trace.json)
- **Memory example (v1.3):** [`traces/tokyo-trip.trace.json`](../traces/tokyo-trip.trace.json) — one task across two sessions
- **Starter template:** [`traces/example-minimal.trace.json`](../traces/example-minimal.trace.json)

## Top level

```jsonc
{
  "version": "1.3",                   // "1.0" | "1.1" | "1.2" | "1.3"
  "meta": {
    "id": "fix-broken-page",          // stable slug
    "title": "Fix the broken product page",
    "description": "One or two sentences.",
    "contextWindowTokens": 4096       // budget shown by the token meter
  },
  "tools": [                          // rendered in the toolbox panel
    { "name": "read_file", "description": "Open a file and see exactly what's inside." }
  ],
  "initialArtifact": { /* the world before the run — see below */ },
  "events": [ /* the run itself, in order */ ]
}
```

## Events

Thirteen event types. Every event has a unique `id` and a `tokens` estimate —
hand-tuned and plausible, not exact. The engine derives live context usage by
folding over events. Any event may carry an optional `annotation` (v1.1) — a
short authorial note the UI renders in the margin, used sparingly.

| type | payload | meaning |
|---|---|---|
| `system_prompt` | `summary` | the agent's standing instructions (summarized) |
| `user_message` | `text` | what the human asked |
| `thinking` | `text` | the agent reasoning, in plain language |
| `tool_call` | `tool`, `input` | the agent acting |
| `tool_result` | `tool`, `output`, `artifact?` | what the world said back |
| `assistant_message` | `text`, `citations?` | the agent's answer to the human |
| `context_evicted` | `evictedEventIds`, `tokens` | earlier items dropped from the window (v1.1) |
| `search` | `query`, `results` | the agent searched the web (v1.2) |
| `fetch` | `sourceId`, `url`, `status`, `extracted?` | the agent read (or failed to read) a page (v1.2) |
| `compaction` | `replacesEventIds`, `summary`, `tokensBefore`, `tokens` | earlier items compressed into one smaller, lossy summary (v1.3) |
| `session_break` | `label`, `tokens` (0) | a hard reset: the window is emptied; only files survive (v1.3) |
| `memory_write` | `path`, `content` | a durable note written to a file (v1.3) |
| `memory_read` | `path`, `content` | a file read back into the window (v1.3) |

Every `tool` referenced by a `tool_call` / `tool_result` must be declared in
`tools`. Event `id`s must be unique. Live context usage — `+tokens` per event,
`−tokens` per eviction — must stay within `meta.contextWindowTokens` at every
step.

## Context eviction (v1.1)

Real agents run out of window. A `context_evicted` event models the moment the
oldest context is dropped to make room:

```jsonc
{
  "id": "e12",
  "type": "context_evicted",
  "evictedEventIds": ["e01", "e02", "e03"], // events removed from the window
  "tokens": 460                             // must equal the sum of their tokens
}
```

Rules the validator enforces:

- Each id in `evictedEventIds` must reference an earlier event that is still in
  the window (not unknown, not yet seen, not already evicted).
- `tokens` must equal the summed `tokens` of the events it evicts — so the
  running total the engine derives can never drift from the file.
- The engine **subtracts** `tokens` and removes those events from the live
  window; the eviction marker itself is not window content.

`context_evicted` and `annotation` are 1.1 features and are rejected in a trace
that still declares `version: "1.0"`, so the version field stays honest.

## Web retrieval (v1.2)

When a question needs facts the model isn't sure of, a real agent searches the
web, reads a few pages, and cites what it used. Version 1.2 models that with a
`sources` registry, `search` and `fetch` events, and `citations` on the answer.

### The `sources` registry

An optional top-level array declaring every source once, so a panel can render
its chip consistently. Search results, fetches, and citations all reference a
source by `sourceId`.

```jsonc
"sources": [
  {
    "sourceId": "nfsa",                            // referenced everywhere else
    "title": "Reheating rice safely — Food Standards Agency",
    "url": "foodstandards.gov.example/rice-safety", // invented; nothing is fetched live
    "faviconHue": 210                               // DEPRECATED — see note below
  }
]
```

> **`faviconHue` is deprecated (no longer rendered).** It was a 0–360 hue that
> tinted each source's chip and citation thread. Episode 02's UI dropped it in
> favour of the series' fixed telemetry palette (§6): source chips are neutral,
> told apart by their label and glyph, and citation threads render in signal
> cyan only — the thread → source mapping is carried by hovering or focusing a
> citation. The field is **kept in the schema for back-compat** (existing traces
> still validate and it stays required on a `sources` entry), but no renderer
> reads it. New traces may set any valid value; `210` is a fine default.

### `search` and `fetch`

```jsonc
{
  "id": "e04",
  "type": "search",
  "query": "is it safe to reheat rice food safety",
  "results": [                                  // each references a registry source
    { "sourceId": "nfsa", "title": "…", "url": "…", "snippet": "…" }
  ],
  "tokens": 210                                 // the query + snippets entering context
}
{
  "id": "e06",
  "type": "fetch",
  "sourceId": "nfsa",
  "url": "foodstandards.gov.example/rice-safety",
  "status": "ok",                               // "ok" | "unreadable"
  "extracted": "Uncooked rice can carry spores …", // the fragment that enters context
  "tokens": 340
}
```

A `fetch` with `status: "ok"` **must** carry the `extracted` fragment (that's
what entered the window). A `fetch` with `status: "unreadable"` — a page that
returned no readable text, e.g. a JavaScript-only shell — **must omit**
`extracted` and costs only the few tokens of the empty response.

### `citations` on the answer

```jsonc
{
  "id": "e13",
  "type": "assistant_message",
  "text": "Short version: reheating rice is safe …",
  "citations": [
    { "spanStart": 175, "spanEnd": 287, "sourceIds": ["nfsa"] } // half-open [start, end)
  ]
}
```

Each citation binds a half-open character span `[spanStart, spanEnd)` of the
answer text to the source(s) it came from.

Rules the validator enforces:

- Every `sourceId` in a search result, a fetch, or a citation must be declared
  in the `sources` registry, and registry ids must be unique.
- A citation span must satisfy `0 ≤ spanStart < spanEnd ≤ text.length`.
- **A source can only be cited once it has been fetched with `status: "ok"`
  earlier in the run** — a page that can't be read can't be cited. This is the
  episode's thesis, encoded in the schema.

`search`, `fetch`, `citations`, and the `sources` registry are 1.2 features and
are rejected in a trace that still declares `version: "1.0"` or `"1.1"`.

## Memory (v1.3)

The window is finite and ephemeral: it holds what the agent knows *right now*, and
it runs out. **Memory is what the agent deliberately writes down outside the window
so it survives.** Version 1.3 models the whole arc — compressing context, saving
notes to a file, ending a session, and picking the work back up in a fresh window.

### `compaction` — smaller and blurrier

When the window fills, old context can be compressed into a shorter summary. The
compaction replaces the events it names with one digest item (this event itself):

```jsonc
{
  "id": "e13",
  "type": "compaction",
  "replacesEventIds": ["e04", "e06", "e08"], // items compressed away
  "summary": "Research digest: quiet temples in Yanaka …", // the surviving text
  "tokensBefore": 1730,   // what the replaced items occupied (sum of their tokens)
  "tokens": 430           // the AFTER size — the summary is a normal window item
}
```

Rules the validator enforces:

- Every id in `replacesEventIds` must be a live window item (not unknown, not
  already gone).
- `tokensBefore` must equal the summed `tokens` of the replaced items.
- `tokens` (the summary's size) must be **less than** `tokensBefore` — a
  compaction has to shrink. The window drops by `tokensBefore − tokens`.

Compression is lossy on purpose: a good trace makes the summary visibly drop
something real (the Tokyo trace keeps "some temples close early midweek" but
loses the exact opening hours). Note there is no separate `tokensAfter` field —
the summary is an ordinary window item, so its post-size is just its `tokens`,
like every other event.

### `session_break` — the window empties

A hard reset. Everything in the window is gone; the running total returns to zero.
The only thing that survives is the **artifact file layer** — memory notes are
files, and files persist.

```jsonc
{ "id": "e16", "type": "session_break", "label": "The next day", "tokens": 0 }
```

`tokens` must be `0` — a break costs nothing; it only clears.

### `memory_write` and `memory_read` — notes, not neurons

The most reliable memory an agent has is a file it wrote. A `memory_write` records
a note into the artifact's `files`; a later `memory_read` — even in a brand-new
session after a `session_break` — pulls it back into the window.

```jsonc
{ "id": "e14", "type": "memory_write", "path": "notes/tokyo-trip.md", "content": "# Working notes …", "tokens": 260 }
{ "id": "e19", "type": "memory_read",  "path": "notes/tokyo-trip.md", "content": "# Working notes …", "tokens": 260 }
```

Rules the validator enforces:

- A `memory_read` must reference a `path` that an earlier `memory_write` (or the
  `initialArtifact.files`) actually wrote.
- Its `content` must be **byte-identical** to what is on that file — you read
  back exactly the note you wrote, not a paraphrase. This is the episode's thesis,
  encoded in the schema.

`compaction`, `session_break`, `memory_write`, and `memory_read` are 1.3 features
and are rejected in a trace that still declares `version` `"1.0"`, `"1.1"`, or
`"1.2"`.

## The artifact — the visible world

```jsonc
{
  "kind": "webpage",
  "files": { "page.html": "…", "price.js": "…" },  // 2–3 small files max
  "renderId": "broken-both"   // key for the pre-rendered visual state
}
```

When a `tool_result` changes the world, it carries an `artifact` — a **full
snapshot, not a diff**. Snapshots keep the replay engine trivial and make
timeline scrubbing instant. `renderId` selects which visual state the
"browser" panel shows (implemented as a component switch, not screenshots).

## Writing your own trace

1. Copy `traces/example-minimal.trace.json`.
2. Script your scenario: aim for 15–25 events, and make sure the artifact
   visibly changes at least once — watching the world heal is the payoff.
3. Validate: `pnpm trace:validate` (also runs in CI on every push).

## Changelog

### 1.3

- Added memory. A `compaction` event compresses earlier window items into one
  smaller, lossy `summary` (the window drops by `tokensBefore − tokens`). A
  `session_break` event empties the window entirely, leaving only the artifact
  file layer. `memory_write` and `memory_read` events save a durable note to a
  file and read it back — even across a session break — with the read content
  validated byte-for-byte against what was written. The checked-in
  [`traces/tokyo-trip.trace.json`](../traces/tokyo-trip.trace.json) is the first
  consumer: one research task carried across two sessions.
- The replay engine folds the new events (compaction nets `tokens − tokensBefore`;
  a session break resets the running total to zero) and derives memory files onto
  the artifact snapshot so a panel can show the note sitting outside the window.
- Backward compatible: every 1.0, 1.1, and 1.2 trace validates and renders
  unchanged, and the new features are rejected in a trace still declared 1.0,
  1.1, or 1.2.

### 1.2

- Added web retrieval: a `search` event (a query plus results), a `fetch` event
  that reads one page and may come back `unreadable`, an optional top-level
  `sources` registry, and optional `citations` on `assistant_message` binding
  answer spans to their sources. The checked-in
  [`traces/reheat-rice.trace.json`](../traces/reheat-rice.trace.json) is the
  first consumer.
- The replay engine now derives a per-frame source status (`listed` → `read` /
  `unreadable`) so panels can light source chips as the run progresses.
- Backward compatible: every 1.0 and 1.1 trace validates and renders unchanged,
  and the new features are rejected in a trace still declared 1.0 or 1.1.

### 1.1

- Added the `context_evicted` event: earlier items fall out of the window when
  it fills. The engine folds `−tokens` for it; the checked-in failure trace
  `traces/context-overflow.trace.json` is the first consumer.
- Added an optional `annotation` on any event (an authorial margin note).
- Both are backward compatible: 1.0 traces validate and render unchanged, and
  the two new features are rejected in a trace still declared `version: "1.0"`.

### 1.0

- Initial format: the six core event types, full-snapshot artifacts, token
  accounting, `fix-broken-page` and `example-minimal` traces.
