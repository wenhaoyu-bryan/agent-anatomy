import { useEffect, useRef } from "react";
import { create } from "zustand";

/**
 * Shared state for the single tracked <Canvas> (PLAN §7: one canvas instance,
 * scenes swapped by visibility). Three "slots" — hero (Scene A), S3 pinned
 * scene and S4 replay panel (both Scene B) — register their DOM elements;
 * the canvas overlays whichever is most visible.
 */

export type GlMode = "pending" | "webgl" | "fallback";
export type SlotId = "hero" | "s3" | "s4";

/** s4 wins over s3 wins over hero when visibility ties. */
const SLOT_PRIORITY: SlotId[] = ["s4", "s3", "hero"];

interface GlStore {
  mode: GlMode;
  activeSlot: SlotId | null;
  slotEls: Record<SlotId, HTMLElement | null>;
  slotRatios: Record<SlotId, number>;
  /** Scroll-scrub progress of the pinned S3 section, 0..1. */
  s3Progress: number;
  setMode: (mode: GlMode) => void;
  registerSlot: (id: SlotId, el: HTMLElement | null) => void;
  setRatio: (id: SlotId, ratio: number) => void;
  setS3Progress: (progress: number) => void;
}

function resolveActive(ratios: Record<SlotId, number>): SlotId | null {
  let best: SlotId | null = null;
  let bestRatio = 0.04; // below this the slot doesn't count as visible
  for (const id of SLOT_PRIORITY) {
    if (ratios[id] > bestRatio) {
      best = id;
      bestRatio = ratios[id];
    }
  }
  return best;
}

export const useGlStore = create<GlStore>((set) => ({
  mode: "pending",
  activeSlot: null,
  slotEls: { hero: null, s3: null, s4: null },
  slotRatios: { hero: 0, s3: 0, s4: 0 },
  s3Progress: 0,
  setMode: (mode) => set({ mode }),
  registerSlot: (id, el) =>
    set((state) => ({ slotEls: { ...state.slotEls, [id]: el } })),
  setRatio: (id, ratio) =>
    set((state) => {
      const slotRatios = { ...state.slotRatios, [id]: ratio };
      return { slotRatios, activeSlot: resolveActive(slotRatios) };
    }),
  setS3Progress: (s3Progress) => set({ s3Progress }),
}));

/** Register a DOM element as a canvas slot and track its visibility. */
export function useGlSlot(id: SlotId) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { registerSlot, setRatio } = useGlStore.getState();
    registerSlot(id, el);
    const io = new IntersectionObserver(
      ([entry]) => setRatio(id, entry!.isIntersecting ? entry!.intersectionRatio : 0),
      { threshold: [0, 0.05, 0.2, 0.4, 0.6, 0.8, 1] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      registerSlot(id, null);
      setRatio(id, 0);
    };
  }, [id]);

  return ref;
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
