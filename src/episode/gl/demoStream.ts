import type { Category } from "./palette";

/**
 * Seeded demo data for the S3 scroll-scrubbed scene — the shape of a typical
 * run (system prompt → request → files → tool results), not the episode
 * trace itself. S4 replays the real trace; S3 just teaches the filling.
 */
export interface DemoItem {
  category: Category;
  tokens: number;
  /** Source label shown next to the stream origin (DOM, S3 only). */
  label?: string;
}

export const S3_DEMO_ITEMS: DemoItem[] = [
  { category: "system", tokens: 420, label: "System prompt" },
  { category: "user", tokens: 40, label: "Your request" },
  { category: "thinking", tokens: 60 },
  { category: "tool", tokens: 20 },
  { category: "tool", tokens: 310, label: "File contents" },
  { category: "thinking", tokens: 55 },
  { category: "tool", tokens: 15 },
  { category: "tool", tokens: 180, label: "Tool results" },
  { category: "thinking", tokens: 70 },
  { category: "tool", tokens: 25 },
  { category: "tool", tokens: 140 },
  { category: "assistant", tokens: 90 },
];

export const S3_DEMO_TOTAL = S3_DEMO_ITEMS.reduce((sum, item) => sum + item.tokens, 0);

/** Deterministic PRNG so particle settle positions never change between runs. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
