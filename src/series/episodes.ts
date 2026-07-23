/**
 * The episode series — the single source of truth. Every episode close, the
 * prev/next nav, and the landing render from this list, so the roster can never
 * drift between pages again (the bug this file fixes: five hand-maintained
 * copies, all stale). Internal hrefs run through import.meta.env.BASE_URL, per
 * PLAN's rule that all internal links carry the base path.
 */
const BASE = import.meta.env.BASE_URL;

export const SUGGEST_URL =
  "https://github.com/wenhaoyu-bryan/agent-anatomy/issues/new?template=episode-suggestion.md";

export type EpisodeEntry = {
  /** Stable id; each episode page passes its own as `currentId`. */
  id: string;
  number: string;
  title: string;
  blurb: string;
  href: string;
};

/** Live episodes, in reading order. */
export const EPISODES: EpisodeEntry[] = [
  {
    id: "ep01",
    number: "01",
    title: "How an AI agent works",
    blurb: "The loop, the context window, and what happens when you give an AI a task.",
    href: `${BASE}episodes/how-an-agent-works/`,
  },
  {
    id: "ep15",
    number: "1.5",
    title: "Where agents go wrong",
    blurb: "Context overflow, wrong turns, dead ends — and how agents recover.",
    href: `${BASE}episodes/where-agents-go-wrong/`,
  },
  {
    id: "ep02",
    number: "02",
    title: "How AI reads the web",
    blurb: "Search, selection, reading a page, and citations.",
    href: `${BASE}episodes/how-ai-reads-the-web/`,
  },
  {
    id: "ep03",
    number: "03",
    title: "How agents remember",
    blurb: "Compaction, session breaks, and the notes an agent writes to itself.",
    href: `${BASE}episodes/how-agents-remember/`,
  },
  {
    id: "ep04",
    number: "04",
    title: "How agents work together",
    blurb: "Delegation — one lead splitting a job across helpers, each with its own fresh window.",
    href: `${BASE}episodes/how-agents-work-together/`,
  },
];

/** The open "suggest a topic" slot that always closes the series. */
export const SUGGEST_ENTRY = {
  number: "05",
  title: "What should we open up next?",
  blurb: "Season one is done — the series stays open. Suggest a topic you’d want to see.",
  href: SUGGEST_URL,
} as const;

/** Neighbours for the prev/next footer nav — episodes only, no wrap-around. */
export function neighbors(id: string): { prev: EpisodeEntry | null; next: EpisodeEntry | null } {
  const i = EPISODES.findIndex((e) => e.id === id);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? EPISODES[i - 1]! : null,
    next: i < EPISODES.length - 1 ? EPISODES[i + 1]! : null,
  };
}
