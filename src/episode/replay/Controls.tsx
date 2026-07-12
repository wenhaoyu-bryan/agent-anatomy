import type { ReactNode } from "react";
import { useReplayStore } from "./store";

/** Transport controls. Inline SVG only (PLAN §3 — no icon packs). */
export function Controls() {
  const frame = useReplayStore((s) => s.frame);
  const length = useReplayStore((s) => s.length);
  const playing = useReplayStore((s) => s.playing);
  const { toStart, prev, next, toEnd, togglePlay } = useReplayStore.getState();

  const atStart = frame.index <= -1;
  const atEnd = frame.index >= length - 1;

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Replay controls">
      <TransportButton label="Jump to start" onClick={toStart} disabled={atStart}>
        <path d="M6 3v10M13 3 7.5 8 13 13V3Z" />
      </TransportButton>
      <TransportButton label="Previous event" onClick={prev} disabled={atStart}>
        <path d="m10.5 3.5-5 4.5 5 4.5" fill="none" />
      </TransportButton>
      <TransportButton label={playing ? "Pause" : "Play"} onClick={togglePlay} emphasized>
        {playing ? (
          <path d="M5.5 3.5h2v9h-2zM10.5 3.5h2v9h-2z" />
        ) : (
          <path d="m5.5 3 8 5-8 5V3Z" />
        )}
      </TransportButton>
      <TransportButton label="Next event" onClick={next} disabled={atEnd}>
        <path d="m5.5 3.5 5 4.5-5 4.5" fill="none" />
      </TransportButton>
      <TransportButton label="Jump to end" onClick={toEnd} disabled={atEnd}>
        <path d="M10 3v10M3 3l5.5 5L3 13V3Z" />
      </TransportButton>
    </div>
  );
}

function TransportButton({
  label,
  onClick,
  disabled = false,
  emphasized = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  emphasized?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`pressable flex size-9 items-center justify-center rounded border border-[var(--color-hairline)] disabled:cursor-default disabled:opacity-35 ${
        emphasized
          ? "bg-[var(--color-tool)] text-[var(--color-canvas)] hover:brightness-110"
          : "bg-[var(--color-panel)] text-[var(--color-ink)] hover:border-[var(--color-muted)]"
      }`}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
