/**
 * The fake product page the agent is fixing — deliberately light-mode so
 * "the world" reads as a different material from the telemetry instrument
 * around it. One component switch per renderId (PLAN §4.2): no screenshots.
 */
export function ProductPage({ renderId }: { renderId: string }) {
  const imageFixed = renderId === "image-fixed" || renderId === "all-fixed";
  const priceFixed = renderId === "all-fixed";

  return (
    <div className="rounded-md bg-[#f4f5f7] p-5 font-[system-ui,sans-serif] text-[#1b2230]">
      <div
        className={`flex aspect-[16/9] items-center justify-center overflow-hidden rounded border bg-white ${
          imageFixed ? "border-[#e2e5ea]" : "border-dashed border-[#c3c9d4]"
        }`}
      >
        {imageFixed ? <KeyboardIllustration /> : <BrokenImage />}
      </div>

      <h3 className="mt-4 text-lg leading-snug font-semibold">Aurora 65 — Mechanical Keyboard</h3>

      <p className="mt-1 text-2xl font-bold tabular-nums" data-testid="product-price">
        {priceFixed ? "$149" : "$NaN"}
      </p>

      <div className="mt-4 w-full rounded bg-[#1b2230] py-2.5 text-center text-sm font-medium text-white select-none">
        Add to cart
      </div>
    </div>
  );
}

/** The classic missing-image glyph, plus the filename the browser asked for. */
function BrokenImage() {
  return (
    <div className="flex flex-col items-center gap-2 text-[#5d6675]">
      <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m3 16 5-5 4 4 3-3 6 6" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="M4 4 20 20" />
      </svg>
      <span className="font-mono text-xs">keybord.jpg</span>
    </div>
  );
}

function KeyboardIllustration() {
  const rows = [14, 14, 12, 10];
  return (
    <svg viewBox="0 0 300 130" className="h-full w-full" aria-hidden="true">
      <rect x="20" y="15" width="260" height="100" rx="10" fill="#2a3244" />
      <rect x="26" y="21" width="248" height="88" rx="6" fill="#39435c" />
      {rows.map((keys, row) =>
        Array.from({ length: keys }, (_, i) => {
          const width = (236 - (keys - 1) * 4) / keys;
          return (
            <rect
              key={`${row}-${i}`}
              x={32 + i * (width + 4)}
              y={28 + row * 19}
              width={width}
              height={15}
              rx={3}
              fill={row === 0 && i < 5 ? "#5ccfe6" : "#e6edf3"}
              opacity={row === 0 && i < 5 ? 0.9 : 0.92}
            />
          );
        }),
      )}
      <rect x="32" y="104" width="150" height="15" rx="3" fill="#e6edf3" opacity="0.92" />
      <rect x="186" y="104" width="82" height="15" rx="3" fill="#ffb454" opacity="0.9" />
    </svg>
  );
}
