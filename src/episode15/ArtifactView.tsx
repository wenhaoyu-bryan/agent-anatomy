import { useReplay } from "../episode/replay/store";

/**
 * "THE PAGE" for Episode 1.5 vignettes — the world each agent acts on, in the
 * same minimal browser frame Episode 01 uses, but with this episode's render
 * states (a stuck banner, a broken contact form healing). Deliberately
 * light-mode so "the world" reads as a different material from the telemetry
 * instrument around it. One component switch per renderId (PLAN §4.2).
 */
export function ArtifactView({ url }: { url: string }) {
  const renderId = useReplay((s) => s.frame.artifact.renderId);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="overflow-hidden rounded-md border border-[var(--color-hairline)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2 rounded-full bg-[var(--color-hairline)]" />
            <span className="size-2 rounded-full bg-[var(--color-hairline)]" />
            <span className="size-2 rounded-full bg-[var(--color-hairline)]" />
          </span>
          <span className="font-mono text-xs text-[var(--color-muted)]">{url}</span>
        </div>
        <World renderId={renderId} />
      </div>
      <span className="micro-label">RENDER {renderId}</span>
    </div>
  );
}

function World({ renderId }: { renderId: string }) {
  if (renderId === "banner-summer") return <BannerSite />;
  return <ContactForm renderId={renderId} />;
}

/**
 * F1's world: a shop header whose banner never changes, no matter how many
 * times the agent "fixes" it — because the edits never reach what's served.
 */
function BannerSite() {
  return (
    <div className="bg-[#f4f5f7] p-5 font-[system-ui,sans-serif] text-[#1b2230]">
      <div className="rounded bg-[#ffe6c2] px-4 py-3 text-center text-sm font-semibold text-[#8a5216]">
        Summer sale — 20% off
      </div>
      <div className="mt-4 h-2.5 w-28 rounded bg-[#d7dbe2]" />
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-square rounded border border-[#e2e5ea] bg-white" />
        ))}
      </div>
    </div>
  );
}

/**
 * F3's world: broken → wired → works. Broken and wired look nearly identical
 * (the fix is in markup), but a fresh render on the fixed form finally shows
 * the confirmation the cached check falsely promised all along.
 */
function ContactForm({ renderId }: { renderId: string }) {
  const sent = renderId === "form-works";
  const wired = renderId === "form-wired";

  return (
    <div className="bg-[#f4f5f7] p-5 font-[system-ui,sans-serif] text-[#1b2230]">
      <h3 className="text-base leading-snug font-semibold">Contact us</h3>

      {sent ? (
        <div className="mt-4 rounded border border-[#bfe3b0] bg-[#e9f7e3] px-4 py-7 text-center">
          <p className="text-sm font-semibold text-[#2f7d1f]">
            ✓ Thanks — your message was sent.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded border border-[#d7dbe2] bg-white px-3 py-2 text-sm text-[#8a93a1]">
            Your email
          </div>
          <div className="h-14 rounded border border-[#d7dbe2] bg-white" />
          <div className="w-full rounded bg-[#1b2230] py-2.5 text-center text-sm font-medium text-white select-none">
            Send message
          </div>
          <p className="text-xs text-[#8a93a1]">
            {wired
              ? "Wired to /api/contact — not yet re-rendered."
              : "Clicking Send does nothing."}
          </p>
        </div>
      )}
    </div>
  );
}
