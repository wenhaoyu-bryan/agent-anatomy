# Trace format v1.0

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
  "version": "1.0",
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

Six event types. Every event has a unique `id` and a `tokens` estimate —
hand-tuned and plausible, not exact. The engine derives cumulative context
usage by folding over events.

| type | payload | meaning |
|---|---|---|
| `system_prompt` | `summary` | the agent's standing instructions (summarized) |
| `user_message` | `text` | what the human asked |
| `thinking` | `text` | the agent reasoning, in plain language |
| `tool_call` | `tool`, `input` | the agent acting |
| `tool_result` | `tool`, `output`, `artifact?` | what the world said back |
| `assistant_message` | `text` | the agent's answer to the human |

Every `tool` referenced by a `tool_call` / `tool_result` must be declared in
`tools`. Event `id`s must be unique. The events' token sum must fit inside
`meta.contextWindowTokens`.

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
