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

const eventBase = {
  id: z.string().min(1),
  /** Rough, plausible token estimate for this event's context cost. */
  tokens: z.number().int().nonnegative(),
  /**
   * Optional authorial voice-over (v1.1). The UI renders it as a small margin
   * note — used sparingly, e.g. "same call, third time".
   */
  annotation: z.string().min(1).optional(),
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
]);

export const traceSchema = z
  .object({
    version: z.enum(["1.0", "1.1", "1.2", "1.3"]),
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
    initialArtifact: artifactStateSchema,
    events: z.array(traceEventSchema).min(1),
  })
  .strict()
  .superRefine((trace, ctx) => {
    const toolNames = new Set(trace.tools.map((tool) => tool.name));
    const isV10 = trace.version === "1.0";
    const isPre12 = trace.version === "1.0" || trace.version === "1.1";
    const isPre13 = isPre12 || trace.version === "1.2";

    const declaredSources = new Set((trace.sources ?? []).map((source) => source.sourceId));

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

    // Fold the run exactly as the replay engine does: normal events enter the
    // window (+tokens), an eviction drops earlier events out of it (−tokens).
    // Validating on the same fold guarantees the checker and the renderer can
    // never disagree about what fits. The fold also tracks which sources have
    // been read "ok" so far — a source can only be cited once it's been read.
    const seenIds = new Set<string>();
    const tokensById = new Map<string, number>();
    const liveIds = new Set<string>();
    const readOk = new Set<string>();
    let running = 0;

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

      if (event.type === "context_evicted") {
        let reclaimed = 0;
        let allResolved = true;
        event.evictedEventIds.forEach((id, j) => {
          if (!liveIds.has(id)) {
            allResolved = false;
            flag(
              ["evictedEventIds", j],
              `evicts "${id}", which is not in the window here (unknown, not yet seen, or already evicted)`,
            );
          } else {
            liveIds.delete(id);
            reclaimed += tokensById.get(id) ?? 0;
          }
        });
        if (allResolved && reclaimed !== event.tokens) {
          flag(
            ["tokens"],
            `tokens must equal the reclaimed sum of the evicted events (${reclaimed}), got ${event.tokens}`,
          );
        }
        running -= event.tokens;
      } else if (event.type === "compaction") {
        // Compress the replaced items into one summary. Reclaim exactly what
        // they occupied (tokensBefore), then the summary enters worth `tokens`.
        let reclaimed = 0;
        let allResolved = true;
        event.replacesEventIds.forEach((id, j) => {
          if (!liveIds.has(id)) {
            allResolved = false;
            flag(
              ["replacesEventIds", j],
              `compacts "${id}", which is not in the window here (unknown, not yet seen, or already gone)`,
            );
          } else {
            liveIds.delete(id);
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
        // The summary is now a live window item, so it can itself be evicted or
        // compacted later.
        liveIds.add(event.id);
        running += event.tokens - event.tokensBefore;
      } else if (event.type === "session_break") {
        if (event.tokens !== 0) {
          flag(["tokens"], `a session_break empties the window and costs nothing: tokens must be 0`);
        }
        // The window is wiped; only the artifact file layer survives.
        liveIds.clear();
        running = 0;
      } else {
        liveIds.add(event.id);
        running += event.tokens;
      }

      if (running < 0) {
        flag(["tokens"], `context total went negative (${running}) — evicted more than was present`);
      }
      if (running > trace.meta.contextWindowTokens) {
        flag(
          ["tokens"],
          `context total ${running} overflows the declared window of ${trace.meta.contextWindowTokens}`,
        );
      }
    });
  });

export type ToolDef = z.infer<typeof toolDefSchema>;
export type ArtifactState = z.infer<typeof artifactStateSchema>;
export type SourceEntry = z.infer<typeof sourceEntrySchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type TraceEvent = z.infer<typeof traceEventSchema>;
export type Trace = z.infer<typeof traceSchema>;
