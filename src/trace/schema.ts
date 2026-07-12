import { z } from "zod";

/**
 * Trace format v1.0 — a complete scripted agent run, one file per scenario.
 *
 * Design rules (see docs/trace-format.md):
 * - Every event carries a hand-tuned `tokens` estimate; the replay engine
 *   derives cumulative context usage by folding over events.
 * - `tool_result.artifact` is a FULL snapshot of the world, not a diff —
 *   snapshots keep the engine trivial and timeline scrubbing instant.
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
]);

export const traceSchema = z
  .object({
    version: z.literal("1.0"),
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
    const seenIds = new Set<string>();
    const toolNames = new Set(trace.tools.map((tool) => tool.name));
    trace.events.forEach((event, i) => {
      if (seenIds.has(event.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["events", i, "id"],
          message: `duplicate event id "${event.id}"`,
        });
      }
      seenIds.add(event.id);
      if ((event.type === "tool_call" || event.type === "tool_result") && !toolNames.has(event.tool)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["events", i, "tool"],
          message: `tool "${event.tool}" is not declared in tools[]`,
        });
      }
    });
    const totalTokens = trace.events.reduce((sum, event) => sum + event.tokens, 0);
    if (totalTokens > trace.meta.contextWindowTokens) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meta", "contextWindowTokens"],
        message: `events sum to ${totalTokens} tokens, which overflows the declared window of ${trace.meta.contextWindowTokens}`,
      });
    }
  });

export type ToolDef = z.infer<typeof toolDefSchema>;
export type ArtifactState = z.infer<typeof artifactStateSchema>;
export type TraceEvent = z.infer<typeof traceEventSchema>;
export type Trace = z.infer<typeof traceSchema>;
