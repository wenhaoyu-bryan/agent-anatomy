const EPISODE_URL = `${import.meta.env.BASE_URL}episodes/how-an-agent-works/`;

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
            status="assembly"
          />
          <EpisodeCard number="02" title="To be announced" blurb="" status="planned" />
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
  status: "live" | "assembly" | "planned";
};

const STATUS_META = {
  live: { label: "Live", color: "var(--color-success)" },
  assembly: { label: "In assembly", color: "var(--color-muted)" },
  planned: { label: "Planned", color: "var(--color-muted)" },
} as const;

function EpisodeCard({ number, title, blurb, href, status }: EpisodeCardProps) {
  const isLive = status === "live";
  const meta = STATUS_META[status];
  const inner = (
    <div
      className={`flex items-baseline gap-5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)] p-5 transition-colors duration-300 md:p-6 ${
        isLive ? "hover:border-[var(--color-muted)]" : ""
      }`}
      style={{ opacity: isLive ? 1 : 0.42 }}
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
          <h2 className="text-lg font-medium md:text-xl" style={{ fontFamily: "var(--font-display)" }}>
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

  if (isLive && href) {
    return (
      <a href={href} className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-tool)]">
        {inner}
      </a>
    );
  }
  return <div aria-disabled="true">{inner}</div>;
}
