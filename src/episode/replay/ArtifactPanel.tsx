import { useReplay } from "./store";
import { ProductPage } from "./ProductPage";

/** "THE PAGE" — the world the agent acts on, in a minimal browser frame. */
export function ArtifactPanel() {
  const artifact = useReplay((s) => s.frame.artifact);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="overflow-hidden rounded-md border border-[var(--color-hairline)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2 rounded-full bg-[var(--color-hairline)]" />
            <span className="size-2 rounded-full bg-[var(--color-hairline)]" />
            <span className="size-2 rounded-full bg-[var(--color-hairline)]" />
          </span>
          <span className="font-mono text-xs text-[var(--color-muted)]">
            aurora-keyboards.shop
          </span>
        </div>
        <ProductPage renderId={artifact.renderId} />
      </div>
      <span className="micro-label">RENDER {artifact.renderId}</span>
    </div>
  );
}
