# Trace format

Current version: **1.1** (backward compatible — every 1.0 trace still validates
and renders unchanged). See the [changelog](#changelog).

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
- **Starter template:** [`traces/example-minimal.trace.json`](../traces/example-minimal.trace.json)

## Top level

```jsonc
{
  "version": "1.1",                   // "1.0" | "1.1"
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

Seven event types. Every event has a unique `id` and a `tokens` estimate —
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
| `assistant_message` | `text` | the agent's answer to the human |
| `context_evicted` | `evictedEventIds`, `tokens` | earlier items dropped from the window (v1.1) |

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
