const EPISODE_01 = `${import.meta.env.BASE_URL}episodes/how-an-agent-works/`;

const LOOP_NODES = [
  { label: "THINK", color: "var(--color-thinking)", cx: 60, cy: 20 },
  { label: "ACT", color: "var(--color-tool)", cx: 96, cy: 82 },
  { label: "OBSERVE", color: "var(--color-success)", cx: 24, cy: 82 },
] as const;

/**
 * The 30-second recap (Episode 1.5): the two ideas Episode 01 established —
 * the loop and the context window — compressed into one figure for readers who
 * skipped it, with a link back. No WebGL; a static loop and a gently filling
 * bar carry the recap, and both settle under reduced motion.
 */
export function RecapFigure() {
  return (
    <section id="recap" aria-labelledby="recap-title" className="reveal px-4 py-20 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <p className="micro-label">30-second recap</p>
        <h2
          id="recap-title"
          className="mt-3 text-2xl font-medium tracking-tight text-balance md:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Two ideas carry this episode
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-[var(--color-muted)]">
          New here? Episode 01 established both of these. Every failure ahead is one of them
          breaking down.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <figure className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 p-5">
            <svg viewBox="0 0 120 104" className="mx-auto h-32 w-auto" aria-hidden="true">
              <circle
                cx="60"
                cy="56"
                r="34"
                fill="none"
                stroke="var(--color-hairline)"
                strokeWidth="1.25"
                transform="rotate(-90 60 56)"
              />
              {[15, 135, 255].map((deg) => (
                <path
                  key={deg}
                  d="M60 22 l-3.5 5 h7 Z"
                  fill="var(--color-muted)"
                  transform={`rotate(${deg} 60 56)`}
                />
              ))}
              {LOOP_NODES.map((node) => (
                <g key={node.label}>
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r="17"
                    fill="var(--color-panel)"
                    stroke={node.color}
                    strokeWidth="1.25"
                  />
                  <text
                    x={node.cx}
                    y={node.cy + 3}
                    textAnchor="middle"
                    fill={node.color}
                    fontFamily="var(--font-mono)"
                    fontSize="7"
                    letterSpacing="1"
                  >
                    {node.label}
                  </text>
                </g>
              ))}
            </svg>
            <figcaption className="mt-4">
              <p className="text-sm font-medium">The loop</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                An agent doesn&rsquo;t answer — it works. Think, act with a tool, observe the
                result, repeat, until the job is done.
              </p>
            </figcaption>
          </figure>

          <figure className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-panel)]/40 p-5">
            <div className="flex h-32 flex-col justify-center gap-2">
              <div className="flex items-baseline justify-between">
                <span className="micro-label">Context window</span>
                <span className="micro-label">fills as it works</span>
              </div>
              <div
                role="img"
                aria-label="A context window filling toward its limit as the run goes on"
                className="h-4 w-full overflow-hidden rounded-sm border border-[var(--color-hairline)] bg-[var(--color-canvas)]"
              >
                <div className="recap-fill h-full w-[10%] bg-[var(--color-tool)]" />
              </div>
              <div className="flex justify-between">
                <span className="micro-label">empty</span>
                <span className="micro-label">full</span>
              </div>
            </div>
            <figcaption className="mt-4">
              <p className="text-sm font-medium">The context window</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                Everything the agent knows must fit in one window — every message, thought, and
                file it reads spends budget.
              </p>
            </figcaption>
          </figure>
        </div>

        <a
          href={EPISODE_01}
          className="mt-6 inline-block text-sm text-[var(--color-muted)] underline decoration-[var(--color-hairline)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
        >
          Watch Episode 01 in full →
        </a>
      </div>
    </section>
  );
}
