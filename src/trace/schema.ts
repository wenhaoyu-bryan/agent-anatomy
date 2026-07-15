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
 * Versions (backward compatible — a 1.0 trace still validates and renders):
 * - 1.0: the six original event types.
 * - 1.1: adds the `context_evicted` event (drops earlier items out of the
 *   window when it fills) and an optional `annotation` on any event. Both are
 *   rejected in a trace that still declares `version: "1.0"`, so the version
 *   field stays honest.
 */

export const toolDefSchema = z
  .object({
    /** e.g. "read_file", "edit_file", "render_page" */
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
    .object({ ...eventBase, type: z.literal("assistant_message"), text: z.string().min(1) })
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
]);

export const traceSchema = z
  .object({
    version: z.enum(["1.0", "1.1"]),
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
    initialArtifact: artifactStateSchema,
    events: z.array(traceEventSchema).min(1),
  })
  .strict()
  .superRefine((trace, ctx) => {
    const toolNames = new Set(trace.tools.map((tool) => tool.name));
    const isV10 = trace.version === "1.0";

    // Fold the run exactly as the replay engine does: normal events enter the
    // window (+tokens), an eviction drops earlier events out of it (−tokens).
    // Validating on the same fold guarantees the checker and the renderer can
    // never disagree about what fits.
    const seenIds = new Set<string>();
    const tokensById = new Map<string, number>();
    const liveIds = new Set<string>();
    let running = 0;

    trace.events.forEach((event, i) => {
      const flag = (key: Array<string | number>, message: string): void => {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["events", i, ...key], message });
      };

      if (seenIds.has(event.id)) flag(["id"], `duplicate event id "${event.id}"`);
      seenIds.add(event.id);
      tokensById.set(event.id, event.tokens);

      // The version field stays honest: 1.1-only features can't appear in a 1.0 trace.
      if (isV10 && event.type === "context_evicted") {
        flag(["type"], `"context_evicted" requires version "1.1"`);
      }
      if (isV10 && event.annotation !== undefined) {
        flag(["annotation"], `"annotation" requires version "1.1"`);
      }

      if (event.type === "tool_call" || event.type === "tool_result") {
        if (!toolNames.has(event.tool)) {
          flag(["tool"], `tool "${event.tool}" is not declared in tools[]`);
        }
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
export type TraceEvent = z.infer<typeof traceEventSchema>;
export type Trace = z.infer<typeof traceSchema>;
