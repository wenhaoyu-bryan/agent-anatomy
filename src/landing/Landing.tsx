import { EPISODES, SUGGEST_ENTRY } from "../series/episodes";

const REPO_URL = "https://github.com/wenhaoyu-bryan/agent-anatomy";
const PORTFOLIO_URL = "https://wenhaoyu-bryan.github.io/";

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
          {EPISODES.map((ep) => (
            <EpisodeCard
              key={ep.id}
              number={ep.number}
              title={ep.title}
              blurb={ep.blurb}
              href={ep.href}
              status="live"
            />
          ))}
          <EpisodeCard
            number={SUGGEST_ENTRY.number}
            title={SUGGEST_ENTRY.title}
            blurb={SUGGEST_ENTRY.blurb}
            href={SUGGEST_ENTRY.href}
            status="suggest"
          />
        </section>

        <footer className="mt-auto pt-16">
          <p className="micro-label">
            Made by{" "}
            <a
              href={PORTFOLIO_URL}
              className="underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
            >
              Wenhao Yu
            </a>{" "}
            · Open source · MIT ·{" "}
            <a
              href={REPO_URL}
              className="underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
            >
              ★ Star on GitHub
            </a>
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
