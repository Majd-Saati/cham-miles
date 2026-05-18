import { useEffect } from "react";

/**
 * Globally throttles wheel + touch + keyboard scrolling so users cannot
 * blast past scroll-driven animations with a single fast wheel spin or
 * trackpad fling. Big deltas are clamped and applied gradually via
 * requestAnimationFrame, while still feeling natural for normal scrolls.
 */
export default function ScrollThrottle({
  maxPixelsPerFrame = 18,
  decay = 0.9,
}: {
  maxPixelsPerFrame?: number;
  decay?: number;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let pending = 0;
    let rafId: number | null = null;

    const tick = () => {
      if (Math.abs(pending) < 0.5) {
        pending = 0;
        rafId = null;
        return;
      }
      const step =
        Math.sign(pending) *
        Math.min(Math.abs(pending), maxPixelsPerFrame);
      window.scrollBy(0, step);
      pending -= step;
      pending *= decay;
      rafId = requestAnimationFrame(tick);
    };

    const enqueue = (delta: number) => {
      // Respect global step-lock set while a phase animation is in flight.
      const lockUntil = (window as any).__scrollLockUntil ?? 0;
      if (performance.now() < lockUntil) {
        return;
      }
      // Clamp how much a single event can add — prevents giant wheel spins
      // from queueing a huge scroll burst.
      const clamped =
        Math.sign(delta) * Math.min(Math.abs(delta), maxPixelsPerFrame * 4);
      // Cap total queued distance so backlog never grows unbounded.
      const maxQueue = maxPixelsPerFrame * 12;
      pending = Math.max(
        -maxQueue,
        Math.min(maxQueue, pending + clamped),
      );
      if (rafId == null) rafId = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // allow pinch-zoom
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16; // lines -> px
      else if (e.deltaMode === 2) dy *= window.innerHeight; // pages -> px
      enqueue(dy);
    };

    let lastTouchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (lastTouchY == null) return;
      const y = e.touches[0]?.clientY ?? lastTouchY;
      const dy = lastTouchY - y;
      lastTouchY = y;
      e.preventDefault();
      enqueue(dy);
    };
    const onTouchEnd = () => {
      lastTouchY = null;
    };

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      const vh = window.innerHeight;
      const map: Record<string, number> = {
        PageDown: vh * 0.9,
        PageUp: -vh * 0.9,
        ArrowDown: 60,
        ArrowUp: -60,
        " ": vh * 0.9,
      };
      const delta = map[e.key];
      if (delta == null) return;
      e.preventDefault();
      enqueue(delta);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [maxPixelsPerFrame, decay]);

  return null;
}