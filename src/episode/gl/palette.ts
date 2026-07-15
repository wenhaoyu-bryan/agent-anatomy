import type { TraceEvent } from "../../trace/schema";

/**
 * Raw hex twins of the CSS custom properties in tokens.css — the canvas
 * can't read var(). If tokens.css changes, change these with it.
 */
export const GL_COLORS = {
  canvas: "#0b0e14",
  panel: "#121826",
  hairline: "#243043",
  muted: "#8b98a9",
  thinking: "#ffb454",
  tool: "#5ccfe6",
  success: "#87d96c",
  user: "#f07178",
} as const;

export type Category = "system" | "user" | "thinking" | "tool" | "assistant";

export const CATEGORY_HEX: Record<Category, string> = {
  system: GL_COLORS.muted,
  user: GL_COLORS.user,
  thinking: GL_COLORS.thinking,
  tool: GL_COLORS.tool,
  assistant: GL_COLORS.success,
};

export function categoryOf(type: TraceEvent["type"]): Category {
  switch (type) {
    case "system_prompt":
      return "system";
    case "user_message":
      return "user";
    case "thinking":
      return "thinking";
    case "tool_call":
    case "tool_result":
      return "tool";
    case "assistant_message":
      return "assistant";
    case "context_evicted":
      // A bookkeeping event, not window content — treated as system-grey where
      // it surfaces at all. The eviction's visible drama is the particles that
      // LEAVE, coloured by whatever they originally were.
      return "system";
  }
}
