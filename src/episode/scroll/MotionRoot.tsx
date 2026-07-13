import { useEffect } from "react";
import { whenIdle } from "../../lib/idle";

/**
 * Page-level motion plumbing (M4): Lenis smooth scroll bridged to
 * ScrollTrigger, plus quiet .reveal section entries via IntersectionObserver.
 *
 * Progressive enhancement: server HTML ships fully visible; the `js-motion`
 * class arms the hidden→revealed transition only on capable clients.
 * Reduced motion: nothing here runs (PLAN §8 — Lenis disabled, no reveals).
 */
export function MotionRoot() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("js-motion");

    let cancelled = false;
    let cleanupLenis: (() => void) | undefined;
    void whenIdle()
      .then(() => Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]))
      .then(([{ default: Lenis }, { gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const lenis = new Lenis({ lerp: 0.12 });
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        cleanupLenis = () => {
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      },
    );

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    return () => {
      cancelled = true;
      io.disconnect();
      cleanupLenis?.();
      document.documentElement.classList.remove("js-motion");
    };
  }, []);

  return null;
}
