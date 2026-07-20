import { z } from "zod";

/**
 * Trace format — a complete scripted agent run, one file per scenario.
 *
 * Design rules (see docs/trace-format.md):
 * - Every event carries a hand-tuned `tokens` estimate; the replay engine
 *   derives cumulative context usage by folding over events.
 * - `tool_result.artifact` is a FULL snapshot of the world, not a diff —
 *   snapshots keep the engine trivial and timeline scrubbing instant.
 *
 * Versions (backward compatible — a 1.0, 1.1, or 1.2 trace still validates and
 * renders unchanged):
 * - 1.0: the six original event types.
 * - 1.1: adds the `context_evicted` event (drops earlier items out of the
 *   window when it fills) and an optional `annotation` on any event.
 * - 1.2: adds web retrieval — a `search` event, a `fetch` event (which may
 *   come back "unreadable"), an optional top-level `sources` registry, and
 *   optional `citations` on `assistant_message` binding answer spans to the
 *   sources they came from.
 * - 1.3: adds memory — a `compaction` event (compresses earlier window items
 *   into one smaller, lossy summary), a `session_break` event (empties the
 *   window entirely; only files in the artifact layer survive), and
 *   `memory_write` / `memory_read` events (a durable note written to a file,
 *   then read back into a fresh window). Context is what's in the window now;
 *   memory is what got written down outside it.
 * - 1.4: adds multi-agent delegation — an optional top-level `agents` registry
 *   (each helper has its own `contextWindowTokens`), an optional `agentId` on
 *   every event (which agent's window it belongs to; default "lead", which is
 *   implicit and never declared), and two event types: `agent_spawn` (the lead
 *   hands a helper a brief, which becomes that helper's first and only context
 *   item — its window resets to just the brief) and `agent_result` (the helper
 *   reports one condensed summary, which enters the LEAD's window). Each agent's
 *   window is derived independently; the events stay one flat, globally ordered
 *   array — "parallel" lanes are a presentational projection of that timeline.
 *
 * Each newer version's features are rejected in a trace that still declares an
 * older version, so the version field always tells the truth about the file.
 */

export const toolDefSchema = z
  .object({
    /** e.g. "read_file", "edit_file", "search_web" */
    name: z.string().min(1),
    /** One plain-English line, rendered in the toolbox panel. */
    description: z.string().min(1),
  })
  .strict();

/** The visible world the agent acts on. For episode 1: a tiny fake webpage. */
export const artifactStateSchema = z
  .object({
    kind: z.literal("webpage"),
    /** path -> file contents (keep it to 2–3 small files). */
    files: z.record(z.string()),
    /**
     * Pre-rendered visual state key — what the "browser" panel shows.
     * Resolved by a React component switch, not screenshots.
     */
    renderId: z.string().min(1),
  })
  .strict();

/**
 * A source the agent can find, read, and cite (v1.2). The top-level `sources`
 * registry declares every source once so panels render its chip consistently;
 * search results, fetches, and citations all reference it by `sourceId`.
 */
export const sourceEntrySchema = z
  .object({
    sourceId: z.string().min(1),
    title: z.string().min(1),
    /** Display URL — invented, plausible; the trace never fetches live. */
    url: z.string().min(1),
    /**
     * DEPRECATED (kept for back-compat; no renderer reads it). Was a 0–360 hue
     * for the source chip. Episode 02's UI now uses only the §6 telemetry
     * palette — chips are neutral, threads are signal cyan. See
     * docs/trace-format.md. Still required on a `sources` entry so prior traces
     * validate unchanged.
     */
    faviconHue: z.number().int().min(0).max(360),
  })
  .strict();

/** One hit inside a `search` event's results (v1.2). References the registry. */
export const searchResultSchema = z
  .object({
    sourceId: z.string().min(1),
    title: z.string().min(1),
    url: z.string().min(1),
    snippet: z.string().min(1),
  })
  .strict();

/**
 * A citation on an `assistant_message` (v1.2): the half-open character span
 * `[spanStart, spanEnd)` of the answer text, and the source(s) it came from.
 */
export const citationSchema = z
  .object({
    spanStart: z.number().int().nonnegative(),
    spanEnd: z.number().int().positive(),
    sourceIds: z.array(z.string().min(1)).min(1),
  })
  .strict();

/**
 * A helper agent the lead can delegate to (v1.4). Declared once in the
 * top-level `agents` registry; each has its own context window. The lead is
 * implicit (`agentId: "lead"`, window = `meta.contextWindowTokens`) and is
 * never declared here.
 */
export const agentDefSchema = z
  .object({
    agentId: z.string().min(1),
    /** Display name, e.g. "VENUE". */
    name: z.string().min(1),
    /** This helper's own (small) context budget. */
    contextWindowTokens: z.number().int().positive(),
  })
  .strict();

const eventBase = {
  id: z.string().min(1),
  /** Rough, plausible token estimate for this event's context cost. */
  tokens: z.number().int().nonnegative(),
  /**
   * Optional authorial voice-over (v1.1). The UI renders it as a small margin
   * note — used sparingly, e.g. "same call, third time".
   */
  annotation: z.string().min(1).optional(),
  /**
   * Which agent's window this event belongs to (v1.4). Defaults to "lead".
   * A non-lead id must be declared in `agents[]` and already spawned.
   */
  agentId: z.string().min(1).optional(),
};

export const traceEventSchema = z.discriminatedUnion("type", [
  z
    .object({ ...eventBase, type: z.literal("system_prompt"), summary: z.string().min(1) })
    .strict(),
  z.object({ ...eventBase, type: z.literal("user_message"), text: z.string().min(1) }).strict(),
  z.object({ ...eventBase, type: z.literal("thinking"), text: z.string().min(1) }).strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("tool_call"),
      tool: z.string().min(1),
      input: z.record(z.unknown()),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("tool_result"),
      tool: z.string().min(1),
      output: z.string(),
      /** If this event changes the world, the new FULL state. */
      artifact: artifactStateSchema.optional(),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("assistant_message"),
      text: z.string().min(1),
      /** Spans of `text` bound to their sources (v1.2). */
      citations: z.array(citationSchema).min(1).optional(),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("context_evicted"),
      /** Ids of earlier events dropped from the window to make room (v1.1). */
      evictedEventIds: z.array(z.string().min(1)).min(1),
      /**
       * Tokens reclaimed by this eviction — must equal the sum of the evicted
       * events' own `tokens`. The engine SUBTRACTS this from the running total.
       */
      tokens: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("search"),
      /** The query the agent ran (v1.2). */
      query: z.string().min(1),
      /** Results surfaced, each referencing a registry source. */
      results: z.array(searchResultSchema).min(1),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("fetch"),
      /** The source being read (v1.2), referencing the registry. */
      sourceId: z.string().min(1),
      url: z.string().min(1),
      /** "unreadable" is the GEO beat — a page that returned no readable text. */
      status: z.enum(["ok", "unreadable"]),
      /** The fragment that entered context. Required for "ok", forbidden otherwise. */
      extracted: z.string().min(1).optional(),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("compaction"),
      /** Ids of earlier window items compressed away into `summary` (v1.3). */
      replacesEventIds: z.array(z.string().min(1)).min(1),
      /** The surviving digest that replaces them — smaller, and lossy. */
      summary: z.string().min(1),
      /**
       * What the replaced items occupied before compaction — must equal the
       * sum of their `tokens`. This event's own `tokens` is the AFTER size (the
       * summary is a normal window item; its cost is its `tokens`, like every
       * other event). The window drops by `tokensBefore − tokens`, and a
       * compaction must shrink, so `tokens < tokensBefore`.
       */
      tokensBefore: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("session_break"),
      /** A short label for the boundary, e.g. "The next day" (v1.3). */
      label: z.string().min(1),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("memory_write"),
      /** The file path written, e.g. "notes/tokyo-trip.md" (v1.3). */
      path: z.string().min(1),
      /** The full contents written to that file — a durable note. */
      content: z.string().min(1),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("memory_read"),
      /** The file path read back into the window (v1.3). */
      path: z.string().min(1),
      /** The contents pulled in — must match what was written to `path`. */
      content: z.string().min(1),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("agent_spawn"),
      /**
       * The helper being started (v1.4), declared in `agents[]`. Spawning
       * resets that helper's window to just this brief — a fresh context.
       */
      spawnedAgentId: z.string().min(1),
      /**
       * The brief handed over — becomes the helper's first (and, at the moment
       * of spawn, only) context item, verbatim. `tokens` is its window cost to
       * the helper, not the lead: delegation offloads the work.
       */
      task: z.string().min(1),
    })
    .strict(),
  z
    .object({
      ...eventBase,
      type: z.literal("agent_result"),
      /**
       * The condensed digest the helper reports back (v1.4). Set `agentId` to
       * the helper that produced it; the summary enters the LEAD's window as a
       * single item — the lead never sees the helper's full work, only this.
       */
      summary: z.string().min(1),
    })
    .strict(),
]);

export const traceSchema = z
  .object({
    version: z.enum(["1.0", "1.1", "1.2", "1.3", "1.4"]),
    meta: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        /** Rough model of the context budget, for the token meter. */
        contextWindowTokens: z.number().int().positive(),
      })
      .strict(),
    /** Tools available to the agent in this run. */
    tools: z.array(toolDefSchema).min(1),
    /** Sources the agent can find/read/cite (v1.2). Declared once, referenced by id. */
    sources: z.array(sourceEntrySchema).optional(),
    /** Helper agents the lead can delegate to (v1.4). The lead is implicit. */
    agents: z.array(agentDefSchema).optional(),
    initialArtifact: artifactStateSchema,
    events: z.array(traceEventSchema).min(1),
  })
  .strict()
  .superRefine((trace, ctx) => {
    const toolNames = new Set(trace.tools.map((tool) => tool.name));
    const isV10 = trace.version === "1.0";
    const isPre12 = trace.version === "1.0" || trace.version === "1.1";
    const isPre13 = isPre12 || trace.version === "1.2";
    const isPre14 = isPre13 || trace.version === "1.3";

    const declaredSources = new Set((trace.sources ?? []).map((source) => source.sourceId));

    // Per-agent windows (v1.4). The lead is implicit (never declared) and uses
    // meta.contextWindowTokens; each declared helper carries its own budget.
    // The token fold below is per-lane — for a trace with no agents it is just
    // the lead lane and behaves exactly as it did before 1.4.
    const LEAD = "lead";
    const agentWindows = new Map<string, number>([[LEAD, trace.meta.contextWindowTokens]]);
    const spawned = new Set<string>();

    // Memory (v1.3): notes are files. Track the artifact file map as the run
    // folds so a `memory_read` can be checked against what was actually
    // written — and so files survive a `session_break` (which only clears the
    // window, not the artifact layer). A `tool_result` snapshot replaces it.
    let files = new Map(Object.entries(trace.initialArtifact.files));

    // A top-level sources registry is a 1.2 feature; keep the version honest.
    if (isPre12 && trace.sources !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sources"],
        message: `a "sources" registry requires version "1.2"`,
      });
    }
    // Registry ids must be unique so a chip never renders twice.
    const seenSourceIds = new Set<string>();
    (trace.sources ?? []).forEach((source, i) => {
      if (seenSourceIds.has(source.sourceId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sources", i, "sourceId"],
          message: `duplicate source id "${source.sourceId}"`,
        });
      }
      seenSourceIds.add(source.sourceId);
    });

    // A top-level agents registry is a 1.4 feature; keep the version honest.
    if (isPre14 && trace.agents !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agents"],
        message: `an "agents" registry requires version "1.4"`,
      });
    }
    // Registry ids must be unique, and "lead" is implicit — it can't be declared.
    const seenAgentIds = new Set<string>();
    (trace.agents ?? []).forEach((agent, i) => {
      if (agent.agentId === LEAD) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["agents", i, "agentId"],
          message: `"lead" is implicit and cannot be declared in agents[]`,
        });
      }
      if (seenAgentIds.has(agent.agentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["agents", i, "agentId"],
          message: `duplicate agent id "${agent.agentId}"`,
        });
      }
      seenAgentIds.add(agent.agentId);
      agentWindows.set(agent.agentId, agent.contextWindowTokens);
    });

    // Fold the run exactly as the replay engine does: normal events enter the
    // window (+tokens), an eviction drops earlier events out of it (−tokens).
    // Validating on the same fold guarantees the checker and the renderer can
    // never disagree about what fits. The fold also tracks which sources have
    // been read "ok" so far — a source can only be cited once it's been read.
    const seenIds = new Set<string>();
    const tokensById = new Map<string, number>();
    const readOk = new Set<string>();
    // One lane per agent: its window, running total, and live-item ids. The
    // lead lane materialises lazily like any other; a single-agent trace only
    // ever touches it.
    const lanes = new Map<string, { window: number; running: number; live: Set<string> }>();
    const getLane = (id: string): { window: number; running: number; live: Set<string> } => {
      let lane = lanes.get(id);
      if (!lane) {
        lane = { window: agentWindows.get(id) ?? trace.meta.contextWindowTokens, running: 0, live: new Set<string>() };
        lanes.set(id, lane);
      }
      return lane;
    };

    trace.events.forEach((event, i) => {
      const flag = (key: Array<string | number>, message: string): void => {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["events", i, ...key], message });
      };

      if (seenIds.has(event.id)) flag(["id"], `duplicate event id "${event.id}"`);
      seenIds.add(event.id);
      tokensById.set(event.id, event.tokens);

      // The version field stays honest: newer features can't appear in an older trace.
      if (isV10 && event.type === "context_evicted") {
        flag(["type"], `"context_evicted" requires version "1.1"`);
      }
      if (isV10 && event.annotation !== undefined) {
        flag(["annotation"], `"annotation" requires version "1.1"`);
      }
      if (isPre12 && (event.type === "search" || event.type === "fetch")) {
        flag(["type"], `"${event.type}" requires version "1.2"`);
      }
      if (isPre12 && event.type === "assistant_message" && event.citations !== undefined) {
        flag(["citations"], `"citations" requires version "1.2"`);
      }
      if (
        isPre13 &&
        (event.type === "compaction" ||
          event.type === "session_break" ||
          event.type === "memory_write" ||
          event.type === "memory_read")
      ) {
        flag(["type"], `"${event.type}" requires version "1.3"`);
      }
      if (isPre14 && (event.type === "agent_spawn" || event.type === "agent_result")) {
        flag(["type"], `"${event.type}" requires version "1.4"`);
      }
      if (isPre14 && event.agentId !== undefined) {
        flag(["agentId"], `an "agentId" on an event requires version "1.4"`);
      }

      // Agent-reference integrity (v1.4): every referenced agent must be
      // declared (or the implicit lead), only the lead spawns, and a helper
      // can't report or act before the lead has spawned it.
      if (event.agentId !== undefined && event.agentId !== LEAD && !agentWindows.has(event.agentId)) {
        flag(["agentId"], `references agent "${event.agentId}", which is not declared in agents[]`);
      }
      if (event.type === "agent_spawn") {
        if (event.agentId !== undefined && event.agentId !== LEAD) {
          flag(["agentId"], `only the lead spawns helpers — agent_spawn.agentId must be "lead" or omitted`);
        }
        if (event.spawnedAgentId === LEAD) {
          flag(["spawnedAgentId"], `cannot spawn the lead agent`);
        } else if (!agentWindows.has(event.spawnedAgentId)) {
          flag(["spawnedAgentId"], `spawns "${event.spawnedAgentId}", which is not declared in agents[]`);
        }
      } else if (event.type === "agent_result") {
        const reporter = event.agentId ?? LEAD;
        if (reporter === LEAD) {
          flag(["agentId"], `an agent_result must set agentId to the helper that produced it, not the lead`);
        } else if (!spawned.has(reporter)) {
          flag(["agentId"], `agent "${reporter}" reports a result before it was spawned`);
        }
      } else if (event.agentId !== undefined && event.agentId !== LEAD && !spawned.has(event.agentId)) {
        flag(["agentId"], `agent "${event.agentId}" acts before it was spawned`);
      }

      if (event.type === "tool_call" || event.type === "tool_result") {
        if (!toolNames.has(event.tool)) {
          flag(["tool"], `tool "${event.tool}" is not declared in tools[]`);
        }
      }

      if (event.type === "search") {
        event.results.forEach((result, j) => {
          if (!declaredSources.has(result.sourceId)) {
            flag(
              ["results", j, "sourceId"],
              `references source "${result.sourceId}", which is not declared in sources[]`,
            );
          }
        });
      }

      if (event.type === "fetch") {
        if (!declaredSources.has(event.sourceId)) {
          flag(["sourceId"], `references source "${event.sourceId}", which is not declared in sources[]`);
        }
        if (event.status === "ok" && event.extracted === undefined) {
          flag(["extracted"], `a fetch with status "ok" must carry the "extracted" fragment`);
        }
        if (event.status === "unreadable" && event.extracted !== undefined) {
          flag(["extracted"], `a fetch with status "unreadable" extracted nothing — omit "extracted"`);
        }
        if (event.status === "ok") readOk.add(event.sourceId);
      }

      if (event.type === "assistant_message" && event.citations) {
        event.citations.forEach((citation, j) => {
          if (citation.spanStart >= citation.spanEnd) {
            flag(["citations", j], `spanStart (${citation.spanStart}) must be < spanEnd (${citation.spanEnd})`);
          }
          if (citation.spanEnd > event.text.length) {
            flag(
              ["citations", j, "spanEnd"],
              `spanEnd ${citation.spanEnd} runs past the answer text (length ${event.text.length})`,
            );
          }
          citation.sourceIds.forEach((sourceId, k) => {
            if (!declaredSources.has(sourceId)) {
              flag(["citations", j, "sourceIds", k], `cites "${sourceId}", which is not declared in sources[]`);
            } else if (!readOk.has(sourceId)) {
              // The episode's thesis, enforced by the schema: a page that
              // wasn't read "ok" earlier can't be cited.
              flag(
                ["citations", j, "sourceIds", k],
                `cites "${sourceId}", which was never fetched "ok" before this answer`,
              );
            }
          });
        });
      }

      // Memory files (v1.3): a write records the file; a read must match what
      // was written; a tool_result snapshot replaces the whole file map. Files
      // are the artifact layer — they survive a session_break.
      if (event.type === "memory_write") {
        files.set(event.path, event.content);
      }
      if (event.type === "memory_read") {
        if (!files.has(event.path)) {
          flag(
            ["path"],
            `reads "${event.path}", which no earlier event wrote (and it isn't in the initial files)`,
          );
        } else if (files.get(event.path) !== event.content) {
          // The episode's thesis, enforced by the schema: what you read back is
          // exactly the note you wrote — the file didn't change on its own.
          flag(["content"], `the content read from "${event.path}" doesn't match what was written there`);
        }
      }
      if (event.type === "tool_result" && event.artifact) {
        files = new Map(Object.entries(event.artifact.files));
      }

      // Per-lane token fold — the same fold the engine runs. Most events land
      // in their own agent's window; a spawn seeds the HELPER's window (a fresh
      // reset), and a result lands in the LEAD's window (the digest it receives).
      let touched: string;
      if (event.type === "agent_spawn") {
        spawned.add(event.spawnedAgentId);
        const lane = getLane(event.spawnedAgentId);
        // A spawn resets the helper's window to just the brief (fresh context).
        lane.live = new Set([event.id]);
        lane.running = event.tokens;
        touched = event.spawnedAgentId;
      } else if (event.type === "agent_result") {
        const lane = getLane(LEAD);
        lane.live.add(event.id);
        lane.running += event.tokens;
        touched = LEAD;
      } else {
        const owner = event.agentId ?? LEAD;
        const lane = getLane(owner);
        touched = owner;
        if (event.type === "context_evicted") {
          let reclaimed = 0;
          let allResolved = true;
          event.evictedEventIds.forEach((id, j) => {
            if (!lane.live.has(id)) {
              allResolved = false;
              flag(
                ["evictedEventIds", j],
                `evicts "${id}", which is not in agent "${owner}"'s window here (unknown, not yet seen, or already evicted)`,
              );
            } else {
              lane.live.delete(id);
              reclaimed += tokensById.get(id) ?? 0;
            }
          });
          if (allResolved && reclaimed !== event.tokens) {
            flag(
              ["tokens"],
              `tokens must equal the reclaimed sum of the evicted events (${reclaimed}), got ${event.tokens}`,
            );
          }
          lane.running -= event.tokens;
        } else if (event.type === "compaction") {
          // Compress the replaced items into one summary. Reclaim exactly what
          // they occupied (tokensBefore), then the summary enters worth `tokens`.
          let reclaimed = 0;
          let allResolved = true;
          event.replacesEventIds.forEach((id, j) => {
            if (!lane.live.has(id)) {
              allResolved = false;
              flag(
                ["replacesEventIds", j],
                `compacts "${id}", which is not in agent "${owner}"'s window here (unknown, not yet seen, or already gone)`,
              );
            } else {
              lane.live.delete(id);
              reclaimed += tokensById.get(id) ?? 0;
            }
          });
          if (allResolved && reclaimed !== event.tokensBefore) {
            flag(
              ["tokensBefore"],
              `tokensBefore must equal the summed tokens of the replaced items (${reclaimed}), got ${event.tokensBefore}`,
            );
          }
          if (event.tokens >= event.tokensBefore) {
            flag(
              ["tokens"],
              `a compaction must shrink the window: tokens (${event.tokens}) must be < tokensBefore (${event.tokensBefore})`,
            );
          }
          // The summary is now a live window item, so it can itself be evicted
          // or compacted later.
          lane.live.add(event.id);
          lane.running += event.tokens - event.tokensBefore;
        } else if (event.type === "session_break") {
          if (event.tokens !== 0) {
            flag(["tokens"], `a session_break empties the window and costs nothing: tokens must be 0`);
          }
          // The window is wiped; only the artifact file layer survives.
          lane.live.clear();
          lane.running = 0;
        } else {
          lane.live.add(event.id);
          lane.running += event.tokens;
        }
      }

      const lane = getLane(touched);
      if (lane.running < 0) {
        flag(
          ["tokens"],
          `context total for agent "${touched}" went negative (${lane.running}) — evicted more than was present`,
        );
      }
      if (lane.running > lane.window) {
        flag(
          ["tokens"],
          `context total ${lane.running} for agent "${touched}" overflows its window of ${lane.window}`,
        );
      }
    });
  });

export type ToolDef = z.infer<typeof toolDefSchema>;
export type AgentDef = z.infer<typeof agentDefSchema>;
export type ArtifactState = z.infer<typeof artifactStateSchema>;
export type SourceEntry = z.infer<typeof sourceEntrySchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type TraceEvent = z.infer<typeof traceEventSchema>;
export type Trace = z.infer<typeof traceSchema>;
