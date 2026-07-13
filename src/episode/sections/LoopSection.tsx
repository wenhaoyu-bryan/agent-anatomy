import { useEffect, useRef } from "react";
import { whenIdle } from "../../lib/idle";
import { useGlStore } from "../gl/glStore";

/**
 * S2 — The Loop (PLAN §5). The naive mental model (one arrow) draws itself,
 * then scroll dissolves it into the real shape: think → act → observe →
 * repeat. SVG + GSAP scrub — no WebGL for diagrams. Reduced-motion/fallback
 * shows the finished loop statically.
 */
export function LoopSection() {
  const mode = useGlStore((s) => s.mode);
  const sectionRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (mode !== "webgl" || !sectionRef.current || !svgRef.current) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void whenIdle()
      .then(() => Promise.all([import("gsap"), import("gsap/ScrollTrigger")]))
      .then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled || !sectionRef.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const q = gsap.utils.selector(svgRef.current!);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 62%",
            end: "center 38%",
            scrub: 0.4,
          },
        });

        // Phase 1: the naive arrow draws.
        tl.fromTo(q("[data-naive-line]"), { strokeDashoffset: 240 }, { strokeDashoffset: 0, duration: 0.22 })
          .fromTo(q("[data-naive-chip]"), { opacity: 0 }, { opacity: 1, duration: 0.08, stagger: 0.06 }, "<")
          // Phase 2: it dissolves — this model is wrong.
          .to(q("[data-naive]"), { opacity: 0.12, duration: 0.12 }, "+=0.08")
          // Phase 3: the loop draws itself, phase by phase.
          .fromTo(q("[data-loop-arc]"), { strokeDashoffset: 590 }, { strokeDashoffset: 0, duration: 0.4 })
          .fromTo(
            q("[data-loop-node]"),
            { opacity: 0, scale: 0.92, transformOrigin: "center" },
            { opacity: 1, scale: 1, duration: 0.1, stagger: 0.09 },
            "<0.05",
          )
          .fromTo(q("[data-loop-repeat]"), { opacity: 0 }, { opacity: 1, duration: 0.1 }, "-=0.05");

        cleanup = () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      },
    );
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [mode]);

  const animated = mode === "webgl";

  return (
    <section
      ref={sectionRef}
      id="the-loop"
      aria-labelledby="loop-title"
      className="px-4 py-28 md:px-6"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-2">
        <div className="reveal max-w-md">
          <p className="micro-label">The loop</p>
          <h2
            id="loop-title"
            className="mt-3 text-3xl font-medium tracking-tight text-balance md:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            It doesn&rsquo;t answer. It works.
          </h2>
          <p className="mt-4 leading-relaxed text-[var(--color-muted)]">
            The obvious mental model: your prompt goes in, an answer comes out. One arrow.
            That&rsquo;s a chatbot — and it&rsquo;s not what an agent does.
          </p>
          <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
            Give an agent a task and it starts a loop. It <Phase c="thinking">thinks</Phase> about
            what to do, <Phase c="tool">acts</Phase> with a tool, and{" "}
            <Phase c="success">observes</Phase> what came back — then thinks again, knowing more
            than before. The loop runs until the job is done.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            Keep this shape in mind. In the replay below, you&rsquo;ll watch a real run tick
            around it, step by step.
          </p>
        </div>

        <LoopDiagram ref={svgRef} animated={animated} />
      </div>
    </section>
  );
}

function Phase({ c, children }: { c: string; children: React.ReactNode }) {
  return (
    <span className="font-medium" style={{ color: `var(--color-${c})` }}>
      {children}
    </span>
  );
}

const NODES = [
  { label: "THINK", color: "var(--color-thinking)", x: 230, y: 102 },
  { label: "ACT", color: "var(--color-tool)", x: 311, y: 243 },
  { label: "OBSERVE", color: "var(--color-success)", x: 149, y: 243 },
] as const;

function LoopDiagram({
  ref,
  animated,
}: {
  ref: React.Ref<SVGSVGElement>;
  animated: boolean;
}) {
  // When not animated (fallback/SSR), everything renders in its final state.
  const naiveStyle = animated ? undefined : { opacity: 0.12 };
  return (
    <svg
      ref={ref}
      viewBox="0 0 460 360"
      role="img"
      aria-label="Diagram: the naive model is one arrow from prompt to answer. The real shape is a loop: think, act, observe, repeat."
      className="reveal mx-auto w-full max-w-lg"
    >
      {/* The naive model — one arrow. */}
      <g data-naive style={naiveStyle} fontFamily="var(--font-mono)" fontSize="11" letterSpacing="1.5">
        <text data-naive-chip x="40" y="24" fill="var(--color-user)">
          PROMPT
        </text>
        <line
          data-naive-line
          x1="110"
          y1="20"
          x2="330"
          y2="20"
          stroke="var(--color-muted)"
          strokeWidth="1.5"
          strokeDasharray="240"
          strokeDashoffset={animated ? 240 : 0}
        />
        <path d="M330 20 l-7 -4 v8 Z" fill="var(--color-muted)" data-naive-chip />
        <text data-naive-chip x="342" y="24" fill="var(--color-ink)">
          ANSWER
        </text>
      </g>

      {/* The real shape — the loop. */}
      <g>
        <circle
          data-loop-arc
          cx="230"
          cy="196"
          r="94"
          fill="none"
          stroke="var(--color-hairline)"
          strokeWidth="1.5"
          strokeDasharray="590"
          strokeDashoffset={animated ? 590 : 0}
          transform="rotate(-90 230 196)"
        />
        {/* Direction arrowheads on the ring */}
        {[15, 135, 255].map((deg) => (
          <g key={deg} data-loop-node transform={`rotate(${deg} 230 196)`} opacity={animated ? 0 : 1}>
            <path d="M230 102 l-5 7 h10 Z" fill="var(--color-muted)" />
          </g>
        ))}
        {NODES.map((node) => (
          <g key={node.label} data-loop-node opacity={animated ? 0 : 1}>
            <circle cx={node.x} cy={node.y} r="34" fill="var(--color-panel)" stroke={node.color} strokeWidth="1.5" />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              fill={node.color}
              fontFamily="var(--font-mono)"
              fontSize="11"
              letterSpacing="1.5"
            >
              {node.label}
            </text>
          </g>
        ))}
        <text
          data-loop-repeat
          x="230"
          y="200"
          textAnchor="middle"
          fill="var(--color-muted)"
          fontFamily="var(--font-mono)"
          fontSize="10"
          letterSpacing="2"
          opacity={animated ? 0 : 1}
        >
          REPEAT
        </text>
      </g>
    </svg>
  );
}
