const REPO_URL = "https://github.com/wenhaoyu-bryan/agent-anatomy";
const PORTFOLIO_URL = "https://wenhaoyu-bryan.github.io/";

const TAKEAWAYS = [
  {
    color: "var(--color-thinking)",
    text: "An agent is a model in a loop: think, act, observe, repeat — until the job is done.",
  },
  {
    color: "var(--color-tool)",
    text: "Everything it knows must fit in the context window, and every tool result spends budget.",
  },
  {
    color: "var(--color-success)",
    text: "You watched the whole run in the transcript. Agents aren’t magic — they’re legible.",
  },
] as const;

/**
 * S5 — Close / series index (PLAN §5). The debrief: what you can now
 * explain, what's next, and the open-source invitation.
 */
export function CloseSection() {
  return (
    <section id="debrief" aria-labelledby="debrief-title" className="px-4 py-28 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="reveal">
          <p className="micro-label">Debrief</p>
          <h2
            id="debrief-title"
            className="mt-3 text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What you can now explain
          </h2>
        </div>

        <ul className="reveal mt-10 flex flex-col gap-4">
          {TAKEAWAYS.map((item, i) => (
            <li
              key={i}
              className="flex items-baseline gap-4 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-4"
            >
              <span className="micro-label shrink-0" style={{ color: item.color }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="leading-relaxed">{item.text}</p>
            </li>
          ))}
        </ul>

        {/* Episode 1.5 slot — structural, not built (PLAN §1 out of scope). */}
        <div className="reveal mt-12 rounded-lg border border-dashed border-[var(--color-hairline)] px-5 py-5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="micro-label">Episode 1.5 · In assembly</p>
            <p className="micro-label">Next</p>
          </div>
          <p className="mt-2 text-lg font-medium" style={{ fontFamily: "var(--font-display)" }}>
            Where agents go wrong
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Context overflow, wrong turns, dead ends — and how agents recover.
          </p>
        </div>

        <div className="reveal mt-12 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 px-5 py-6">
          <p className="micro-label">Open source</p>
          <p className="mt-3 leading-relaxed">
            The replay you just watched isn&rsquo;t a video — it&rsquo;s a JSON trace file played
            by an engine that renders <em>any</em> trace fitting the schema. Write your own run
            and it plays.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={REPO_URL}
              className="pressable rounded border border-[var(--color-hairline)] bg-[var(--color-ink)] px-4 py-2 font-mono text-sm text-[var(--color-canvas)] hover:brightness-90"
            >
              View the repo
            </a>
            <a
              href={`${REPO_URL}/blob/main/docs/trace-format.md`}
              className="pressable rounded border border-[var(--color-hairline)] px-4 py-2 font-mono text-sm hover:border-[var(--color-muted)]"
            >
              Trace format spec
            </a>
          </div>
        </div>

        <p className="reveal mt-16 text-sm text-[var(--color-muted)]">
          Made by{" "}
          <a href={PORTFOLIO_URL} className="underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]">
            Wenhao Yu
          </a>{" "}
          · Open source · MIT ·{" "}
          <a href={REPO_URL} className="underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]">
            ★ Star on GitHub
          </a>
        </p>
      </div>
    </section>
  );
}
