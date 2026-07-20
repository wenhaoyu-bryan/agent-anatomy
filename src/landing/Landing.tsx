const EPISODE_URL = `${import.meta.env.BASE_URL}episodes/how-an-agent-works/`;
const EPISODE_1_5_URL = `${import.meta.env.BASE_URL}episodes/where-agents-go-wrong/`;
const EPISODE_02_URL = `${import.meta.env.BASE_URL}episodes/how-ai-reads-the-web/`;
const EPISODE_03_URL = `${import.meta.env.BASE_URL}episodes/how-agents-remember/`;
const EPISODE_04_URL = `${import.meta.env.BASE_URL}episodes/how-agents-work-together/`;
const SUGGEST_URL =
  "https://github.com/wenhaoyu-bryan/agent-anatomy/issues/new?template=episode-suggestion.md";

export function Landing() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="telemetry-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-dvh max-w-4xl flex-col px-6 py-16 md:py-24">
        <header>
          <p className="micro-label">Agent Anatomy — a series</p>
          <h1
            className="mt-6 max-w-3xl text-4xl leading-[1.05] font-medium tracking-tight md:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Interactive explainers for how AI actually works.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[var(--color-muted)]">
            Short visual essays that open up the machine and show you the moving parts. No
            background needed.
          </p>
        </header>

        <section className="mt-16 grid gap-4 md:mt-24">
          <EpisodeCard
            number="01"
            title="How an AI agent works"
            blurb="The loop, the context window, and what actually happens when you give an AI a task."
            href={EPISODE_URL}
            status="live"
          />
          <EpisodeCard
            number="1.5"
            title="Where agents go wrong"
            blurb="Context overflow, wrong turns, dead ends — and how agents recover."
            href={EPISODE_1_5_URL}
            status="live"
          />
          <EpisodeCard
            number="02"
            title="How AI reads the web"
            blurb="Search, selection, reading a page, and citations — how an agent finds and cites the web."
            href={EPISODE_02_URL}
            status="live"
          />
          <EpisodeCard
            number="03"
            title="How agents remember"
            blurb="Compaction, session breaks, and the notes an agent writes to itself so work survives an empty window."
            href={EPISODE_03_URL}
            status="live"
          />
          <EpisodeCard
            number="04"
            title="How agents work together"
            blurb="Delegation — one lead splitting a job across helpers, each with its own fresh window, working in parallel."
            href={EPISODE_04_URL}
            status="live"
          />
          <EpisodeCard
            number="05"
            title="What should we open up next?"
            blurb="Season one is done — the series stays open. Suggest a topic you’d want to see."
            href={SUGGEST_URL}
            status="suggest"
          />
        </section>

        <footer className="mt-auto pt-16">
          <p className="micro-label">
            Made by Wenhao Yu · Open source · MIT
          </p>
        </footer>
      </div>
    </main>
  );
}

type EpisodeCardProps = {
  number: string;
  title: string;
  blurb: string;
  href?: string;
  status: "live" | "assembly" | "planned" | "suggest";
};

const STATUS_META = {
  live: { label: "Live", color: "var(--color-success)" },
  assembly: { label: "In assembly", color: "var(--color-muted)" },
  planned: { label: "Planned", color: "var(--color-muted)" },
  suggest: { label: "Open", color: "var(--color-tool)" },
} as const;

function EpisodeCard({ number, title, blurb, href, status }: EpisodeCardProps) {
  const isLive = status === "live";
  const isSuggest = status === "suggest";
  const linkable = (isLive || isSuggest) && !!href;
  const meta = STATUS_META[status];
  const inner = (
    <div
      className={`flex items-baseline gap-5 rounded-lg border bg-[var(--color-panel)] p-5 transition-colors duration-300 md:p-6 ${
        isSuggest
          ? "border-dashed border-[var(--color-hairline)] hover:border-[var(--color-tool)]"
          : `border-[var(--color-hairline)] ${isLive ? "hover:border-[var(--color-muted)]" : ""}`
      }`}
      style={{ opacity: isLive || isSuggest ? 1 : 0.42 }}
    >
      <span
        className="shrink-0 text-2xl tabular-nums md:text-3xl"
        style={{
          fontFamily: "var(--font-mono)",
          color: isLive ? "var(--color-tool)" : "var(--color-muted)",
        }}
      >
        {number}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-medium md:text-xl"
            style={{
              fontFamily: "var(--font-display)",
              color: isSuggest ? "var(--color-muted)" : undefined,
            }}
          >
            {title}
          </h2>
          <span className="micro-label flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            {meta.label}
          </span>
        </div>
        {blurb && <p className="mt-1 text-[var(--color-muted)]">{blurb}</p>}
      </div>
    </div>
  );

  if (linkable) {
    return (
      <a href={href} className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-tool)]">
        {inner}
      </a>
    );
  }
  return <div aria-disabled="true">{inner}</div>;
}
