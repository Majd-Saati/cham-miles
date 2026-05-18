import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plane, ExternalLink } from "lucide-react";
import { useEditorContent } from "@/lib/editorContent";

// 17 keyframes from Figma (left→right canvas order). Each captures the
// plane-window canvas size at that scroll moment. Camera stays centered;
// canvas shrinks → zoom-out from inside cabin to outside-view of 3 windows.
const KEYFRAMES = [
  { plane: 4500,  welcome: 733.5, welcomeOpacity: 1 },   // 1 — single closed window in view
  { plane: 4500,  welcome: 733.5, welcomeOpacity: 1 },   // 2 — shade still closed
  { plane: 4500,  welcome: 978,   welcomeOpacity: 1 },   // 3 — shade opening
  { plane: 4500,  welcome: 978,   welcomeOpacity: 1 },   // 4 — peak welcome, fully open
  { plane: 11945, welcome: 884,   welcomeOpacity: 0.8 }, // 5
  { plane: 10120, welcome: 796,   welcomeOpacity: 0.5 }, // 6
  { plane: 8398,  welcome: 696,   welcomeOpacity: 0.2 }, // 7
  { plane: 6568,  welcome: 586,   welcomeOpacity: 0 },   // 8
  { plane: 4962,  welcome: 530,   welcomeOpacity: 0 },   // 9
  { plane: 4068,  welcome: 530,   welcomeOpacity: 0 },   // 10
  { plane: 2024,  welcome: 530,   welcomeOpacity: 0 },   // 11
  { plane: 1582,  welcome: 530,   welcomeOpacity: 0 },   // 12
  { plane: 1440,  welcome: 530,   welcomeOpacity: 0 },   // 13 — zoom complete
  { plane: 1440,  welcome: 530,   welcomeOpacity: 0 },   // 14
  { plane: 1440,  welcome: 530,   welcomeOpacity: 0 },   // 15
  { plane: 1440,  welcome: 530,   welcomeOpacity: 0 },   // 16
  { plane: 1440,  welcome: 530,   welcomeOpacity: 0 },   // 17
];

const SCENE_VH = 800; // 8x viewport-height of pinned scroll distance
const STAGE_W = 1440;
const STAGE_H = 1024;

// Plane exterior fuselage (Figma node 31458:26540): a cream sheet with 3
// elliptical window cutouts. We render it in the SAME coordinate system as
// the plane-window canvas (13468×9577.244) so the cutouts can be aligned
// pixel-for-pixel to each cabin window's white frame — the white window
// border IS the cutout edge.
const PLANE_VB_W = 13468;
const PLANE_VB_H = 9577.244;
// Window containers (left, top, width, height) in plane-canvas coords.
const WINDOW_BOXES = [
  { left: 383.46, top: 3432.47, width: 3385.615, height: 3774.415 },
  { left: 4966.32, top: 3432.47, width: 3385.615, height: 3774.415 },
  { left: 9736.24, top: 3432.47, width: 3385.615, height: 3774.415 },
];
// The actual visible window has aspect ratio 939:864 inside its container
// (centered, fitted by `width: 100%` + `aspectRatio`). So real width = container
// width, real height = container width * 864/939, vertically centered.
const WIN_RATIO = 864 / 939;
// Inner visible window rect (matches the 939×864 box rendered by <Window>):
// width = container width, height = container width * WIN_RATIO, vertically
// centered inside its container. The cream exterior cuts these rects out so
// the cutout edge sits exactly on the white window border.
const INNER_WINDOW_RECTS = WINDOW_BOXES.map((b) => {
  const w = b.width;
  const h = w * WIN_RATIO;
  const left = b.left;
  const top = b.top + (b.height - h) / 2;
  return { left, top, width: w, height: h };
});
// Plane-window corner radius (in plane-canvas units). Same value is applied
// to the cabin <Window> inner box (as a percentage) and to the SVG cutout so
// they match pixel-for-pixel.
const WINDOW_CORNER_R = 600;

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
// Snap a normalized value to exact 0 / 1 when it lies within `eps` of the
// boundary. Used at every phase-progress site (intro 0→0.12, scene reveal
// 0.12→0.16, closing-msg 0.72→0.80, outro 0.8→0.92) so floating-point dust
// near a boundary cannot cause a value like 0.999998 → 1.000002, which
// would re-trigger CSS transitions and produce visible micro-jitter on
// the scaling cabin / sliding shade. Snapping also guarantees that an
// eased value of "exactly 1" is reached when the phase ends, eliminating
// any chance of overshoot from sub-pixel scroll delta noise.
const EPS = 1e-4;
const snap01 = (t: number, eps = EPS) => {
  const c = clamp01(t);
  if (c < eps) return 0;
  if (c > 1 - eps) return 1;
  return c;
};
// Phase-local progress helper: converts a global progress value to a
// snapped, clamped local progress within [start, end]. Single source of
// truth for every phase boundary in Stage.
const phaseT = (p: number, start: number, end: number) =>
  snap01((p - start) / (end - start));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// Easings tuned to match Figma prototype's Smart Animate "Gentle" curves.
// easeInOutCubic — main zoom in/out (slow-fast-slow, very smooth).
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
// easeOutCubic — shade opening / scene reveal (decelerates into rest).
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
// easeInCubic — shade closing / scene exit (accelerates away).
const easeInCubic = (t: number) => t * t * t;
// cubic-bezier(0.64, 0.01, 0.16, 1) — matches TiersSection's EASE constant.
// Newton-Raphson solver to invert x(t)=u, then evaluate y(t).
const bezier064 = (() => {
  const x1 = 0.64, y1 = 0.01, x2 = 0.16, y2 = 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (u: number) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let t = u;
    for (let i = 0; i < 8; i++) {
      const x = sampleX(t) - u;
      const dx = sampleDX(t);
      if (Math.abs(x) < 1e-5) break;
      if (Math.abs(dx) < 1e-6) break;
      t -= x / dx;
    }
    return sampleY(Math.max(0, Math.min(1, t)));
  };
})();
// Custom bridge easing — designed for C1 continuity with the linear intro.
//
// At p=0.12 the intro ends with constant velocity dV_intro = (4500-1440)/0.12
// = 25500 px/p. A naive easeOutCubic for the bridge would launch at
// 3 * (11945-4500)/0.13 ≈ 171800 px/p — a 6.7× sudden acceleration that
// reads as a "kick" at the handoff. This easing starts at the SAME slope
// as the intro and then accelerates smoothly via a cubic tail:
//   k(s) = a*s + (1-a)*s^3,  with a = 25500 * 0.13 / 7445 ≈ 0.445
// which gives k(0)=0, k(1)=1, and k'(0)=a so the bridge's initial
// dPlane/dp matches the intro exactly — no perceptible velocity jump.
const BRIDGE_START_SLOPE = (25500 * 0.13) / 7445; // ~0.445
const easeBridge = (s: number) =>
  BRIDGE_START_SLOPE * s + (1 - BRIDGE_START_SLOPE) * s * s * s;

// ===== Constant-speed zoom-out =====
// To make the camera feel like ONE uniform motion across the whole flow
// (no slow segments / no sudden bursts), we reparametrize the zoom-out
// keyframes by cumulative |Δplane| instead of giving each segment an
// equal slice of p. The result: dPlane/dp ≈ constant for the entire
// 0.12 → 0.92 range, matching the steady feel of the late zoom-out
// throughout the whole flow.
const ZOOM_KFS = [
  { plane: 4500,  welcome: 978,   welcomeOpacity: 1 },   // = KEYFRAMES[3] peak welcome
  { plane: 11945, welcome: 884,   welcomeOpacity: 0.8 }, // KEYFRAMES[4]
  { plane: 10120, welcome: 796,   welcomeOpacity: 0.5 },
  { plane: 8398,  welcome: 696,   welcomeOpacity: 0.2 },
  { plane: 6568,  welcome: 586,   welcomeOpacity: 0 },
  { plane: 4962,  welcome: 530,   welcomeOpacity: 0 },
  { plane: 4068,  welcome: 530,   welcomeOpacity: 0 },
  { plane: 2024,  welcome: 530,   welcomeOpacity: 0 },
  { plane: 1582,  welcome: 530,   welcomeOpacity: 0 },
  { plane: 1440,  welcome: 530,   welcomeOpacity: 0 },   // = KEYFRAMES[12] zoom complete
] as const;
const ZOOM_RANGE: [number, number] = [0.12, 0.92];
const ZOOM_DISTS = ZOOM_KFS.slice(1).map((k, i) =>
  Math.abs(k.plane - ZOOM_KFS[i].plane),
);
const ZOOM_TOTAL = ZOOM_DISTS.reduce((a, b) => a + b, 0);
// Normalized arc-length positions of each anchor in [0,1].
const ZOOM_TS = (() => {
  const ts: number[] = [0];
  let acc = 0;
  for (const d of ZOOM_DISTS) {
    acc += d;
    ts.push(acc / ZOOM_TOTAL);
  }
  return ts;
})();
// Sample the zoom-out at constant plane-speed. `t` is local progress 0..1
// inside ZOOM_RANGE.
function sampleZoomConstantSpeed(t: number) {
  const tc = clamp01(t);
  let i = 0;
  for (; i < ZOOM_TS.length - 2; i++) {
    if (tc <= ZOOM_TS[i + 1]) break;
  }
  const a = ZOOM_KFS[i];
  const b = ZOOM_KFS[i + 1];
  const t0 = ZOOM_TS[i];
  const t1 = ZOOM_TS[i + 1];
  const local = t1 === t0 ? 0 : (tc - t0) / (t1 - t0);
  return {
    plane: lerp(a.plane, b.plane, local),
    welcome: lerp(a.welcome, b.welcome, local),
    welcomeOpacity: lerp(a.welcomeOpacity, b.welcomeOpacity, local),
  };
}

// Returns the name of the easing/segment currently driving the camera at `p`.
const currentEasing = (p: number): string => {
  if (p < 0.12) return "intro · linear";
  if (p < 0.92) return "zoom · constant-speed";
  return "rest";
};

// Pure LINEAR sampling of the 17 keyframes. The easing is applied ONCE
// upstream (by the unified phase driver in Stage), so this function must
// not introduce its own per-segment curve — otherwise easings would stack
// and velocity would no longer be continuous across phase boundaries.
// `p` here is expected to already be eased (0..1).
function interpKeyframes(p: number) {
  const segs = KEYFRAMES.length - 1;
  const f = p * segs;
  const i = Math.min(Math.floor(f), segs - 1);
  const t = f - i; // linear within segment
  const a = KEYFRAMES[i];
  const b = KEYFRAMES[i + 1];
  return {
    plane: lerp(a.plane, b.plane, t),
    welcome: lerp(a.welcome, b.welcome, t),
    welcomeOpacity: lerp(a.welcomeOpacity, b.welcomeOpacity, t),
  };
}

export default function WindowParallex() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [debug, setDebug] = useState(false);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const content = useEditorContent();
  const { texts, images } = content;
  const imgCloudBackground = images.cloudBackground;
  const imgLogo161 = images.logo;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDebug(params.get("debug") === "1");
  }, []);

  // On every page load/refresh, force the scroll back to the top so the
  // intro animation always starts from p=0 (wide closed cabin) instead of
  // resuming wherever the browser last left it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  // Press "D" anywhere (outside of inputs/textareas) to toggle the debug overlay.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "d" && e.key !== "D") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      setDebug((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Preload window assets so the open/close/sash images are decoded before
  // the scene mounts — prevents any late swap or flash on first paint.
  useEffect(() => {
    const urls = [images.shade, images.handle, images.cloudBackground];
    let cancelled = false;
    Promise.all(
      urls.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    // Failsafe: never block the scene more than 1.5s.
    const t = setTimeout(() => setAssetsReady(true), 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [images.shade, images.handle, images.cloudBackground]);

  useEffect(() => {
    const onScroll = () => {
      const el = sceneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      // Quantize to 4 decimals (~0.01% of the scene) so sub-pixel scroll
      // noise can't produce micro re-renders that re-fire 200ms CSS
      // transitions and look like jitter at phase boundaries.
      const raw = clamp01(-rect.top / total);
      const quantized = Math.round(raw * 10000) / 10000;
      setP((prev) => (prev === quantized ? prev : quantized));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Auto-scroll on mount from 0% → 25.7% of the scene's pinned scroll range.
  // The page remains fully scrollable: any user wheel/touch/key input cancels
  // the auto-scroll so they can move freely (including back to the top).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reducedMotion) return;
    const el = sceneRef.current;
    if (!el) return;

    let raf = 0;
    let cancelled = false;
    const start = performance.now();
    const duration = 3800; // ms — match TiersSection EASE/DURATION
    const top0 = el.getBoundingClientRect().top + window.scrollY;
    const total = el.offsetHeight - window.innerHeight;
    // Stop at 26% — user takes over from there.
    const targetY = top0 + 0.2577 * total;

    const cancel = () => {
      cancelled = true;
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("touchmove", cancel);
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("mousedown", cancel);
    };
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("touchmove", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    window.addEventListener("mousedown", cancel);

    const startY = window.scrollY;
    const tick = (now: number) => {
      if (cancelled) return;
      const t = clamp01((now - start) / duration);
      const eased = bezier064(t);
      window.scrollTo(0, startY + (targetY - startY) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else cancel();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cancel();
    };
  }, [reducedMotion]);

  // Once the user has settled at ~26% (post initial auto-scroll) and gives
  // a single scroll input, take over and slowly animate the remaining
  // 26%→100% of the pinned scene. Triggers exactly once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reducedMotion) return;
    const el = sceneRef.current;
    if (!el) return;

    let raf = 0;
    let cancelled = false;
    let triggered = false;

    const onUserScroll = (e: Event) => {
      if (triggered) return;
      const top0 = el.getBoundingClientRect().top + window.scrollY;
      const total = el.offsetHeight - window.innerHeight;
      const progress = clamp01((window.scrollY - top0) / total);
      // Only fire when we're sitting near the 26% rest point.
      if (progress < 0.24 || progress > 0.32) return;
      triggered = true;
      // Swallow this scroll input so it doesn't add to the auto-scroll.
      if (e.cancelable) e.preventDefault();
      startAuto();
    };

    const startAuto = () => {
      const top0 = el.getBoundingClientRect().top + window.scrollY;
      const total = el.offsetHeight - window.innerHeight;
      const startY = top0 + 0.2577 * total;
      window.scrollTo(0, startY);
      const targetY = top0 + total; // end of pinned scene (p=1)
        // continue one viewport into the Tiers section (component 2)
        const targetYWithTiers = targetY + window.innerHeight;
      const distance = targetYWithTiers - startY;
      const duration = 5200; // slow, smooth take-over
      const start = performance.now();

      const onWheel = (ev: WheelEvent) => {
        if (ev.cancelable) ev.preventDefault();
      };
      const onTouchMove = (ev: TouchEvent) => {
        if (ev.cancelable) ev.preventDefault();
      };
      const onKey = (ev: KeyboardEvent) => {
        if (
          ev.key === "ArrowUp" ||
          ev.key === "PageUp" ||
          ev.key === "Home" ||
          ev.key === "Escape"
        ) {
          cleanup();
        }
      };
      const cleanup = () => {
        cancelled = true;
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("keydown", onKey);
      };
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("keydown", onKey);

      const tick = (now: number) => {
        if (cancelled) return;
        const t = clamp01((now - start) / duration);
        const eased = bezier064(t);
        window.scrollTo(0, startY + distance * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
        else cleanup();
      };
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("wheel", onUserScroll, { passive: false });
    window.addEventListener("touchmove", onUserScroll, { passive: false });
    window.addEventListener("keydown", onUserScroll);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchmove", onUserScroll);
      window.removeEventListener("keydown", onUserScroll);
    };
  }, [reducedMotion]);

  // Dev-only alignment check: append `?alignCheck=1` to the URL and the
  // scene scrolls through several zoom-out progress samples, sampling 4
  // border pixels (top/right/bottom/left mid-edge) of each cabin window
  // and the corresponding exterior ellipse cutout. Pixel deltas larger
  // than the tolerance are reported via console.warn.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("alignCheck") !== "1") return;
    const el = sceneRef.current;
    if (!el) return;
    const TOL = 2; // px
    const samples = [0.65, 0.72, 0.8, 0.88, 0.95];
    const top0 = el.getBoundingClientRect().top + window.scrollY;
    const total = el.offsetHeight - window.innerHeight;

    let i = 0;
    const run = () => {
      if (i >= samples.length) {
        console.info("[alignCheck] done");
        return;
      }
      const target = samples[i++];
      window.scrollTo({ top: top0 + target * total, behavior: "auto" });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const wins = el.querySelectorAll<HTMLElement>("[data-window-inner]");
          const cutouts = el.querySelectorAll<SVGRectElement>("[data-exterior-cutout]");
          if (wins.length !== 3 || cutouts.length !== 3) {
            console.warn("[alignCheck] missing nodes", {
              wins: wins.length,
              cutouts: cutouts.length,
            });
          } else {
            wins.forEach((w, idx) => {
              const wr = w.getBoundingClientRect();
              const er = cutouts[idx].getBoundingClientRect();
              const edges = {
                top: Math.abs(wr.top - er.top),
                right: Math.abs(wr.right - er.right),
                bottom: Math.abs(wr.bottom - er.bottom),
                left: Math.abs(wr.left - er.left),
              };
              const bad = Object.entries(edges).filter(([, v]) => v > TOL);
              if (bad.length) {
                console.warn(
                  `[alignCheck] p=${target.toFixed(2)} window#${idx} misaligned`,
                  edges,
                  { window: wr, ellipse: er },
                );
              } else {
                console.info(
                  `[alignCheck] p=${target.toFixed(2)} window#${idx} ok`,
                  edges,
                );
              }
            });
          }
          setTimeout(run, 80);
        }),
      );
    };
    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={sceneRef}
      className="relative w-full"
      style={{ height: `${reducedMotion ? 200 : SCENE_VH}vh` }}
    >
      {/* Background matches the cabin wall cream so the very first paint
          (before window/shade PNGs decode) blends with the closed-cabin
          intro instead of flashing the old sky-navy color. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#f3ecdb]">
        <div
          className="size-full"
          style={{ opacity: assetsReady ? 1 : 0, transition: "opacity 200ms ease" }}
        >
          <Stage progress={p} reducedMotion={reducedMotion} hidden={hidden} />
        </div>
        {debug && (
          <DebugOverlay progress={p} hidden={hidden} setHidden={setHidden} />
        )}
      </div>
    </div>
  );
}

type HiddenMap = Record<string, boolean>;
const LAYER_KEYS = [
  { key: "background", label: "Background" },
  { key: "welcome", label: "Welcome text" },
  { key: "plane", label: "Windows / plane" },
  { key: "exterior", label: "Exterior fuselage" },
  { key: "closing", label: "Closing message" },
  { key: "scrollHint", label: "Scroll hint" },
  { key: "header", label: "Header" },
] as const;

function DebugOverlay({
  progress,
  hidden,
  setHidden,
}: {
  progress: number;
  hidden: HiddenMap;
  setHidden: React.Dispatch<React.SetStateAction<HiddenMap>>;
}) {
  // Map progress (0..1) to the 17-keyframe step index used by KEYFRAMES.
  const segs = KEYFRAMES.length - 1;
  const f = progress * segs;
  const stepIdx = Math.min(Math.floor(f), segs - 1); // 0..15
  const stepFrac = f - stepIdx;
  const currentStep = stepIdx + 1; // human-readable 1..17
  const nextStep = currentStep + 1;

  // Recompute the same phase values Stage uses, so the overlay lines up
  // with what's actually animating.
  const introEased = easeInOutCubic(clamp01(progress / 0.12));
  const outroEased = easeInOutCubic(clamp01((progress - 0.8) / 0.12));
  const opening = introEased;
  const closing = outroEased;
  const openProgress = introEased * (1 - outroEased);
  const zoomInProgress = introEased; // same driver as opening
  const sceneRevealed = easeOutCubic(clamp01((progress - 0.06) / 0.12));
  const closingMsgIn = easeInOutCubic(clamp01((progress - 0.72) / 0.08));
  const closingOpacity = closingMsgIn * (1 - outroEased);
  const exteriorOpacity =
    clamp01((progress - 0.62) / 0.1) * (1 - clamp01((progress - 0.95) / 0.05));

  const phases: { label: string; range: [number, number]; value: number }[] = [
    { label: "Scroll hint",       range: [0.0,  0.1],  value: clamp01(progress < 0.04 ? 1 : 1 - (progress - 0.04) / 0.06) },
    { label: "Window opening",    range: [0.0,  0.12], value: clamp01(progress / 0.12) },
    { label: "Scene revealed",    range: [0.06, 0.18], value: sceneRevealed },
    { label: "Welcome (peak)",    range: [0.12, 0.50], value: clamp01(1 - Math.abs(progress - 0.18) / 0.18) },
    { label: "Cabin zoom-out + Exterior fuselage", range: [0.12, 0.75], value: clamp01((progress - 0.12) / 0.63) },
    { label: "Closing message",   range: [0.72, 0.92], value: closingOpacity },
    { label: "Window closing",    range: [0.80, 0.92], value: closing },
  ];

  const activePhase = (v: number, r: [number, number]) =>
    progress >= r[0] && progress <= r[1] && v > 0.01;

  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({
    panel: true,
    scrub: true,
    layers: false,
    phases: false,
    boundary: false,
    easing: false,
  });
  const toggle = (k: string) =>
    setOpen((o) => ({ ...o, [k]: !o[k] }));
  const SectionHeader = ({
    id,
    label,
    right,
  }: {
    id: string;
    label: string;
    right?: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => toggle(id)}
      className="flex w-full items-center justify-between gap-2 text-left text-[10px]"
    >
      <span className="flex items-center gap-1 text-emerald-300">
        <span className="w-3 text-white/60">{open[id] ? "▾" : "▸"}</span>
        {label}
      </span>
      {right}
    </button>
  );
  const copySnapshot = async () => {
    const snapshot = {
      progress: +progress.toFixed(4),
      progressPct: +(progress * 100).toFixed(2),
      step: { current: currentStep, next: nextStep, frac: +stepFrac.toFixed(3) },
      viewport:
        typeof window !== "undefined"
          ? { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }
          : null,
      drivers: {
        introEased: +introEased.toFixed(4),
        outroEased: +outroEased.toFixed(4),
        opening: +opening.toFixed(4),
        closing: +closing.toFixed(4),
        openProgress: +openProgress.toFixed(4),
        zoomInProgress: +zoomInProgress.toFixed(4),
        sceneRevealed: +sceneRevealed.toFixed(4),
        closingMsgIn: +closingMsgIn.toFixed(4),
        closingOpacity: +closingOpacity.toFixed(4),
        exteriorOpacity: +exteriorOpacity.toFixed(4),
      },
      phases: phases.map((ph) => ({
        label: ph.label,
        range: ph.range,
        value: +ph.value.toFixed(4),
        active: activePhase(ph.value, ph.range),
      })),
      sample: sampleStageAt(progress),
    };
    const text = JSON.stringify(snapshot, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[9999] w-[280px] rounded-lg bg-black/80 p-3 font-mono text-[11px] text-white shadow-2xl backdrop-blur-sm animate-fade-in">
      <div className="mb-2 flex items-center justify-between border-b border-white/20 pb-2">
        <button
          type="button"
          onClick={() => toggle("panel")}
          className="flex items-center gap-1 font-semibold tracking-wide text-emerald-300"
          title={open.panel ? "Collapse panel" : "Expand panel"}
        >
          <span className="w-3 text-white/60">{open.panel ? "▾" : "▸"}</span>
          SCROLL DEBUG
        </button>
        <div className="flex items-center gap-2">
          <span className="tabular-nums">{(progress * 100).toFixed(1)}%</span>
          <button
            type="button"
            onClick={copySnapshot}
            className={`rounded px-2 py-[2px] text-[10px] ${copied ? "bg-emerald-500 text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
            title="Copy debug snapshot as JSON"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {open.panel && (<>
      {/* Scrubber: drag to jump to any p without scrolling manually. */}
      <div className="mb-3 rounded border border-white/15 bg-white/5 p-2">
        <SectionHeader id="scrub" label="SCRUB" />
        {open.scrub && <div className="mt-1"><ScrubControl progress={progress} /></div>}
      </div>

      {/* Layer visibility toggles */}
      <div className="mb-3 rounded border border-white/15 bg-white/5 p-2">
        <SectionHeader
          id="layers"
          label="LAYERS"
          right={open.layers ? (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); setHidden({}); }}
              className="rounded bg-white/10 px-1.5 py-[1px] text-[9px] text-white hover:bg-white/20"
            >
              Show all
            </span>
          ) : null}
        />
        {open.layers && <div className="mt-1 grid grid-cols-2 gap-1">
          {LAYER_KEYS.map(({ key, label }) => {
            const visible = !hidden[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setHidden((h) => ({ ...h, [key]: !h[key] }))
                }
                className={`flex items-center gap-1 rounded px-1.5 py-[2px] text-left text-[10px] ${
                  visible
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-white/5 text-white/40 line-through"
                }`}
                title={visible ? "Hide" : "Show"}
              >
                <span>{visible ? "👁" : "—"}</span>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>}
      </div>

      <div className="mb-3 rounded border border-white/15 bg-white/5 p-2">
        <SectionHeader
          id="phases"
          label="STEPS & PHASES"
          right={<span className="tabular-nums text-amber-300">step {currentStep}</span>}
        />
        {open.phases && <div className="mt-2">
        <div className="mb-1 flex items-center justify-between">
          <span>Step</span>
          <span className="tabular-nums">
            <span className="text-amber-300">{currentStep}</span>
            <span className="text-white/40"> → </span>
            <span className="text-white/60">{nextStep}</span>
            <span className="ml-1 text-white/40">({(stepFrac * 100).toFixed(0)}%)</span>
          </span>
        </div>
        <div className="mb-3 flex gap-[2px]">
        {KEYFRAMES.map((_, i) => {
          const isActive = i === stepIdx || i === stepIdx + 1;
          const isCurrent = i === stepIdx;
          return (
            <div
              key={i}
              className={`h-2 flex-1 rounded-[1px] transition-colors duration-150 ${
                isCurrent
                  ? "bg-amber-300"
                  : isActive
                    ? "bg-amber-300/40"
                    : "bg-white/15"
              }`}
              title={`Step ${i + 1}`}
            />
          );
        })}
        </div>
        <div className="space-y-1.5">
        {phases.map((ph) => {
          const active = activePhase(ph.value, ph.range);
          return (
            <div key={ph.label}>
              <div className="flex items-center justify-between">
                <span className={active ? "text-emerald-300" : "text-white/50"}>
                  {active ? "● " : "○ "}
                  {ph.label}
                </span>
                <span className="tabular-nums text-white/60">{ph.value.toFixed(2)}</span>
              </div>
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-sm bg-white/10">
                <div
                  className={`h-full transition-[width] duration-100 ${
                    active ? "bg-emerald-400" : "bg-white/30"
                  }`}
                  style={{ width: `${Math.round(clamp01(ph.value) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
        </div>
        </div>}
      </div>

      <div className="mb-3 rounded border border-white/15 bg-white/5 p-2">
        <SectionHeader id="boundary" label="BOUNDARY PROBE" />
        {open.boundary && <div className="mt-1"><BoundaryProbe progress={progress} /></div>}
      </div>

      <div className="rounded border border-white/15 bg-white/5 p-2">
        <SectionHeader
          id="easing"
          label="EASING CURVES"
          right={<span className="text-white/40">p = {(progress * 100).toFixed(1)}%</span>}
        />
        {open.easing && <div className="mt-1">
          <EasingPlot progress={progress} />
          <div className="mt-1 grid grid-cols-2 gap-x-2 text-[9px] leading-tight">
            <span className="text-cyan-300">━ Zoom-in / Open (intro)</span>
            <span className="text-amber-300">━ Closing msg fade</span>
            <span className="text-rose-300">━ Shade close (outro)</span>
            <span className="text-white/50">┊ current p</span>
          </div>
        </div>}
      </div>
      </>)}
    </div>
  );
}

// SVG plot of the easing curves used by Stage. Rendered inside DebugOverlay.
// Scrubber control inside the debug overlay. Lets you jump to any p without
// having to scroll/screenshot manually. Includes preset buttons for the
// common phase boundaries plus a play/pause toggle for hands-free review.
function ScrubControl({ progress }: { progress: number }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.25x .. 4x
  // Total duration of a full 0→1 playthrough at 1x speed.
  const BASE_DURATION_S = 8;
  const totalS = BASE_DURATION_S; // seconds shown on the time bar (at 1x)
  const currentS = progress * totalS;

  const scrollToP = (target: number) => {
    if (typeof window === "undefined") return;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    window.scrollTo({ top: clamp01(target) * total, behavior: "auto" });
  };

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    const from = progress;
    const duration = (BASE_DURATION_S * 1000) / speed; // ms to traverse 0→1
    const span = 1 - from;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * (span || 1)));
      scrollToP(from + span * t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  const presets = [0, 0.04, 0.12, 0.18, 0.5, 0.72, 0.8, 0.92, 1];
  const speeds = [0.25, 0.5, 1, 2, 4];

  return (
    <div className="mb-3 rounded border border-white/15 bg-white/5 p-2">
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-emerald-300">SCRUB</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              scrollToP(0);
            }}
            className="rounded bg-white/10 px-1.5 py-[2px] text-white hover:bg-white/20"
            title="Restart"
          >
            ⟲
          </button>
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="rounded bg-white/10 px-2 py-[2px] text-white hover:bg-white/20"
          >
            {playing ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      {/* Speed selector */}
      <div className="mb-1 flex items-center gap-1">
        <span className="text-[9px] text-white/50">Speed</span>
        {speeds.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            className={`rounded px-1.5 py-[1px] text-[9px] tabular-nums ${
              speed === s
                ? "bg-emerald-400 text-black"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Progress slider */}
      <div className="mb-0.5 flex items-center justify-between text-[9px] text-white/50">
        <span>p</span>
        <span className="tabular-nums">{(progress * 100).toFixed(1)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        onChange={(e) => {
          setPlaying(false);
          scrollToP(parseFloat(e.target.value));
        }}
        className="w-full accent-emerald-400"
      />

      {/* Time (seconds) bar — maps to the same scroll progress */}
      <div className="mt-1 mb-0.5 flex items-center justify-between gap-2 text-[9px]">
        <span className="text-white/50">time</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`rounded px-1 py-[1px] tabular-nums ${
              playing ? "bg-emerald-400 text-black" : "bg-white/10 text-white/70"
            }`}
            title="Playback speed"
          >
            {speed}x
          </span>
          <span
            className="rounded bg-cyan-400/20 px-1 py-[1px] text-cyan-200"
            title="Active easing curve at current p"
          >
            {currentEasing(progress)}
          </span>
          <span className="tabular-nums text-white/50">
            {currentS.toFixed(2)}s / {totalS.toFixed(2)}s
          </span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={totalS}
        step={0.01}
        value={currentS}
        onChange={(e) => {
          setPlaying(false);
          scrollToP(parseFloat(e.target.value) / totalS);
        }}
        className="w-full accent-cyan-400"
      />

      <div className="mt-1 flex flex-wrap gap-1">
        {presets.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setPlaying(false);
              scrollToP(v);
            }}
            className="rounded bg-white/10 px-1.5 py-[1px] text-[9px] tabular-nums text-white/80 hover:bg-white/20"
          >
            {v.toFixed(2)}
          </button>
        ))}
      </div>
    </div>
  );
}

// Each curve is sampled at 80 points across p ∈ [0, 1]. A vertical guide
// marks the current progress so you can read curve heights at-a-glance.
function EasingPlot({ progress }: { progress: number }) {
  const W = 256;
  const H = 70;
  const N = 80;

  // Same formulas as Stage's non-reduced-motion branch.
  const sampleIntro = (p: number) => easeInOutCubic(clamp01(p / 0.12));
  const sampleOutro = (p: number) => easeInOutCubic(clamp01((p - 0.8) / 0.12));
  const sampleClosingMsg = (p: number) =>
    easeInOutCubic(clamp01((p - 0.72) / 0.08)) * (1 - sampleOutro(p));

  const buildPath = (fn: (p: number) => number) => {
    let d = "";
    for (let i = 0; i <= N; i++) {
      const p = i / N;
      const x = p * W;
      const y = H - clamp01(fn(p)) * H;
      d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return d;
  };

  const px = progress * W;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[70px] w-full rounded-sm bg-white/5"
      preserveAspectRatio="none"
    >
      {/* gridlines at 0%, 25%, 50%, 75%, 100% */}
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line
          key={g}
          x1={g * W}
          x2={g * W}
          y1={0}
          y2={H}
          stroke="white"
          strokeOpacity={g === 0 || g === 1 ? 0.15 : 0.06}
          strokeWidth={0.5}
        />
      ))}
      {/* phase boundary markers at p=0.12 and p=0.8 */}
      {[0.12, 0.8].map((b) => (
        <line
          key={b}
          x1={b * W}
          x2={b * W}
          y1={0}
          y2={H}
          stroke="white"
          strokeOpacity={0.18}
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
      ))}
      {/* curves */}
      <path d={buildPath(sampleIntro)} fill="none" stroke="#67e8f9" strokeWidth={1.5} />
      <path d={buildPath(sampleClosingMsg)} fill="none" stroke="#fcd34d" strokeWidth={1.5} />
      <path d={buildPath(sampleOutro)} fill="none" stroke="#fda4af" strokeWidth={1.5} />
      {/* current-progress guide */}
      <line x1={px} x2={px} y1={0} y2={H} stroke="white" strokeOpacity={0.65} strokeWidth={1} />
      {/* dots where each curve crosses the current progress */}
      {[
        { fn: sampleIntro, color: "#67e8f9" },
        { fn: sampleClosingMsg, color: "#fcd34d" },
        { fn: sampleOutro, color: "#fda4af" },
      ].map((c, i) => (
        <circle
          key={i}
          cx={px}
          cy={H - clamp01(c.fn(progress)) * H}
          r={2.2}
          fill={c.color}
          stroke="black"
          strokeOpacity={0.4}
          strokeWidth={0.5}
        />
      ))}
    </svg>
  );
}

// Single source of truth for what Stage actually computes at any p.
// Used by BoundaryProbe to verify continuity at the intro→mid handoff
// (p=0.12) without depending on Stage's runtime values.
function sampleStageAt(p: number) {
  const introEased = clamp01(p / 0.12);
  const outroEased = easeInOutCubic(clamp01((p - 0.8) / 0.12));
  let planeBase: number;
  if (p < 0.12) {
    planeBase = lerp(1440, ZOOM_KFS[0].plane, introEased);
  } else if (p < 0.92) {
    const zt = (p - ZOOM_RANGE[0]) / (ZOOM_RANGE[1] - ZOOM_RANGE[0]);
    planeBase = sampleZoomConstantSpeed(zt).plane;
  } else {
    planeBase = ZOOM_KFS[ZOOM_KFS.length - 1].plane;
  }
  const openProgress = introEased * (1 - outroEased);
  return { planeBase, openProgress };
}

// Continuity probe centered on a phase boundary. Computes value + slope
// (d/dp via central finite difference) on each side and reports the gap.
// Also tracks live per-frame velocity from the actual `progress` stream
// so jitter or overshoot at the boundary becomes immediately visible.
function BoundaryProbe({ progress }: { progress: number }) {
  const B = 0.12;
  const dp = 1e-4;

  // Static handoff measurement (computed once per render — both sides
  // and a tiny step out for slope estimation).
  const lm = sampleStageAt(B - dp);
  const ll = sampleStageAt(B - 2 * dp);
  const rm = sampleStageAt(B + dp);
  const rr = sampleStageAt(B + 2 * dp);
  const vLeftPlane = (lm.planeBase - ll.planeBase) / dp;
  const vRightPlane = (rr.planeBase - rm.planeBase) / dp;
  const vLeftOpen = (lm.openProgress - ll.openProgress) / dp;
  const vRightOpen = (rr.openProgress - rm.openProgress) / dp;
  const dPlane = rm.planeBase - lm.planeBase;
  const dOpen = rm.openProgress - lm.openProgress;
  const dVPlane = vRightPlane - vLeftPlane;
  const dVOpen = vRightOpen - vLeftOpen;

  // Live per-frame velocity from the real progress stream.
  const prevRef = useRef<{ p: number; plane: number; open: number } | null>(null);
  const live = sampleStageAt(progress);
  let livePlaneVel = 0;
  let liveOpenVel = 0;
  if (prevRef.current) {
    const dpL = progress - prevRef.current.p;
    if (Math.abs(dpL) > 1e-6) {
      livePlaneVel = (live.planeBase - prevRef.current.plane) / dpL;
      liveOpenVel = (live.openProgress - prevRef.current.open) / dpL;
    } else {
      livePlaneVel = 0;
      liveOpenVel = 0;
    }
  }

  // Log a single line whenever progress crosses the boundary, so the
  // console history shows exactly the values + velocities at the handoff.
  useEffect(() => {
    const prev = prevRef.current;
    if (prev) {
      const crossed = (prev.p - B) * (progress - B) <= 0 && prev.p !== progress;
      if (crossed) {
        // eslint-disable-next-line no-console
        console.info(
          "[boundary @ p=0.12] crossed",
          {
            from: prev.p.toFixed(5),
            to: progress.toFixed(5),
            planeL: lm.planeBase.toFixed(2),
            planeR: rm.planeBase.toFixed(2),
            dPlane: dPlane.toFixed(4),
            dPlaneVelocity: dVPlane.toFixed(4),
            openL: lm.openProgress.toFixed(5),
            openR: rm.openProgress.toFixed(5),
            dOpen: dOpen.toFixed(6),
            dOpenVelocity: dVOpen.toFixed(6),
          },
        );
      }
    }
    prevRef.current = { p: progress, plane: live.planeBase, open: live.openProgress };
  }, [progress, live.planeBase, live.openProgress, lm, rm, dPlane, dOpen, dVPlane, dVOpen]);

  const okGap = (v: number, eps: number) => Math.abs(v) < eps;
  const fmt = (v: number, d = 3) => (v >= 0 ? " " : "") + v.toFixed(d);

  return (
    <div className="mt-3 border-t border-white/20 pt-2">
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-emerald-300">BOUNDARY @ p=0.12</span>
        <span className="text-white/40">central Δ, dp=1e-4</span>
      </div>
      <table className="w-full text-[10px] tabular-nums leading-tight">
        <thead className="text-white/40">
          <tr>
            <th className="text-left font-normal">metric</th>
            <th className="text-right font-normal">left⁻</th>
            <th className="text-right font-normal">right⁺</th>
            <th className="text-right font-normal">Δ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-white/70">plane (px)</td>
            <td className="text-right text-cyan-300">{lm.planeBase.toFixed(1)}</td>
            <td className="text-right text-cyan-300">{rm.planeBase.toFixed(1)}</td>
            <td className={`text-right ${okGap(dPlane, 0.5) ? "text-emerald-300" : "text-rose-400"}`}>
              {fmt(dPlane, 3)}
            </td>
          </tr>
          <tr>
            <td className="text-white/70">plane' (px/p)</td>
            <td className="text-right text-cyan-300/80">{fmt(vLeftPlane, 1)}</td>
            <td className="text-right text-cyan-300/80">{fmt(vRightPlane, 1)}</td>
            <td className={`text-right ${okGap(dVPlane, 50) ? "text-emerald-300" : "text-rose-400"}`}>
              {fmt(dVPlane, 1)}
            </td>
          </tr>
          <tr>
            <td className="text-white/70">open (0–1)</td>
            <td className="text-right text-amber-300">{lm.openProgress.toFixed(4)}</td>
            <td className="text-right text-amber-300">{rm.openProgress.toFixed(4)}</td>
            <td className={`text-right ${okGap(dOpen, 1e-3) ? "text-emerald-300" : "text-rose-400"}`}>
              {fmt(dOpen, 5)}
            </td>
          </tr>
          <tr>
            <td className="text-white/70">open' (per p)</td>
            <td className="text-right text-amber-300/80">{fmt(vLeftOpen, 4)}</td>
            <td className="text-right text-amber-300/80">{fmt(vRightOpen, 4)}</td>
            <td className={`text-right ${okGap(dVOpen, 1e-2) ? "text-emerald-300" : "text-rose-400"}`}>
              {fmt(dVOpen, 4)}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="mt-1 flex items-center justify-between text-[10px] text-white/50">
        <span>live plane' = <span className="text-white/80">{fmt(livePlaneVel, 1)}</span></span>
        <span>live open' = <span className="text-white/80">{fmt(liveOpenVel, 4)}</span></span>
      </div>
    </div>
  );
}

function Stage({
  progress,
  reducedMotion,
  hidden = {},
}: {
  progress: number;
  reducedMotion: boolean;
  hidden?: HiddenMap;
}) {
  // Single keyframe sample. interpKeyframes is now LINEAR (no inner
  // easing), so all motion derives from one easing source applied at the
  // phase-driver level below — no stacked curves, no boundary discontinuity.
  const kf = interpKeyframes(progress);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const { texts, images } = useEditorContent();
  const imgCloudBackground = images.cloudBackground;
  const imgLogo161 = images.logo;

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On desktop/tablet keep the cover behaviour so the cabin fills the
      // viewport. On mobile use contain (min) so the window + text never get
      // cropped by the narrow viewport — same animation logic, just fit-to-screen.
      const sx = window.innerWidth / STAGE_W;
      const sy = window.innerHeight / STAGE_H;
      setScale(mobile ? Math.max(Math.min(sx, sy), sx) : Math.max(sx, sy));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Reduced-motion mode swaps the per-frame parallax interpolation for
  // discrete scroll thresholds, then lets CSS transitions handle the change.
  const transitionMs = reducedMotion ? 400 : 200;

  let openProgress: number;
  let sceneRevealed: number;
  let closingOpacity: number;
  let scrollHintOpacity: number;
  let planeBase: number;
  let welcomeWidth: number;
  let welcomeOpacityRaw: number;
  let welcomeOffsetY: number; // px — vertical slide for the welcome block

  if (reducedMotion) {
    const opened = progress > 0.15 ? 1 : 0;
    const closed = progress > 0.8 ? 1 : 0;
    openProgress = opened * (1 - closed);
    sceneRevealed = opened;
    closingOpacity = closed;
    scrollHintOpacity = progress < 0.05 ? 1 : 0;
    planeBase = KEYFRAMES[3].plane;
    welcomeWidth = KEYFRAMES[3].welcome;
    welcomeOpacityRaw = 1;
    welcomeOffsetY = 0;
  } else {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    // Intro phase driver — shared by zoom-in AND shade opening so the
    // two animations advance in lockstep on the SAME easing curve, and
    // both finish exactly at p=0.12. Linear ramp keeps a CONSTANT,
    // non-zero velocity for the full intro so it hands off into the
    // bridge's easeOutCubic (which also starts at max velocity) without
    // any deceleration dwell — no perceptible camera pause near 0.12.
    const introT = phaseT(progress, 0, 0.12);
    const introEased = introT;
    // Outro phase driver — symmetric counterpart of the intro driver.
    // Shared by shade closing AND closing-message fade-out so both animate
    // on the SAME ease-in-out curve (zero velocity at the boundaries),
    // matching the smoothness of the intro and the keyframe interpolation
    // used in between.
    const outroT = phaseT(progress, 0.8, 0.92);
    const outroEased = easeInOutCubic(outroT);
    const closing = outroEased;
    openProgress = introEased * (1 - closing);
    // Scene reveal overlaps the END of the window-opening phase and the
    // START of the cabin zoom-out bridge, so Welcome text + Header fade
    // in WHILE the shade is still finishing AND the zoom-out is already
    // accelerating. The three phases blend into one continuous motion.
    sceneRevealed = easeOutCubic(phaseT(progress, 0.06, 0.18));
    // Closing message fades IN over 0.72 → 0.80, then fades OUT in lockstep
    // with the windows closing (same outroEased curve) so the text and the
    // shade retract together with no perceptible offset.
    const closingMsgIn = easeInOutCubic(phaseT(progress, 0.72, 0.80));
    closingOpacity = closingMsgIn * (1 - outroEased);
    scrollHintOpacity = snap01(progress < 0.04 ? 1 : 1 - (progress - 0.04) / 0.06);
    // Intro phase (p: 0 → 0.12): start at the wide "step ~13" framing
    // (plane = 1440 — all 3 windows + cabin chrome visible) with shades
    // CLOSED, then zoom IN to the single-window framing (plane = 4500)
    // while the shades slide open. After p ≥ 0.12 the existing keyframe
    // curve (zoom further in, then out) plays unchanged.
    if (progress < 0.12) {
      planeBase = lerp(1440, KEYFRAMES[3].plane, introEased);
      welcomeWidth = kf.welcome;
      // Text is hidden above the viewport until the shade finishes opening.
      welcomeOpacityRaw = 1;
      welcomeOffsetY = -vh * 0.6;
    } else if (progress < 0.92) {
      // Constant-speed zoom-out phase (0.12 → 0.92). Anchors are spaced
      // by cumulative |Δplane| so dPlane/dp is uniform across the entire
      // zoom — no slow stretches in short keyframe gaps and no rushes
      // through long ones. Welcome width / opacity ride the same sampler
      // so they stay in lockstep with the camera.
      const zt = phaseT(progress, ZOOM_RANGE[0], ZOOM_RANGE[1]);
      const zs = sampleZoomConstantSpeed(zt);
      planeBase = zs.plane;
      welcomeWidth = zs.welcome;
      // Opacity stays constant — text only translates upward off-screen.
      welcomeOpacityRaw = 1;
      // Welcome text enters (slides DOWN from above) starting at p = 0.142
      // — after the shade has fully opened — then slides UP and exits the
      // top of the viewport during the rest of the zoom-out. All motion
      // is linear so it stays glued to the scroll.
      if (progress < 0.142) {
        welcomeOffsetY = -vh * 0.6;
      } else if (progress < 0.257) {
        const enterT = phaseT(progress, 0.142, 0.257);
        welcomeOffsetY = lerp(-vh * 0.6, 0, enterT);
      } else {
        const exitT = phaseT(progress, 0.257, 0.50);
        welcomeOffsetY = lerp(0, -vh * 0.7, exitT);
      }
    } else {
      // Rest phase (>= 0.92): camera holds at the final zoomed-out frame
      // while the closing message and shade finish their outro fades.
      const last = ZOOM_KFS[ZOOM_KFS.length - 1];
      planeBase = last.plane;
      welcomeWidth = last.welcome;
      welcomeOpacityRaw = 1;
      welcomeOffsetY = -vh * 0.7;
    }
  }

  const planeW = planeBase;
  const planeH = planeBase * (9577.244 / 13468);

  // Exterior fuselage fades in once the cabin has zoomed out enough that the
  // 3 cabin windows align with the 3 ellipse cutouts of the exterior.
  // Exterior fuselage is merged with the cabin zoom-out: it fades in across
  // the same scroll window the cabin shrinks in (steps 4→13, ~p=0.1875→0.75)
  // so the cream frame grows together with the zoom-out instead of popping
  // in afterwards.
  // Exterior fuselage fades in quickly at the start of the zoom-out so the
  // cream frame is fully solid by the time the cabin shrinks — no translucent
  // gap between windows where the sky/wing shows through.
  // Window + frame + cabin sidewall (exterior fuselage) stay visible at
  // full opacity from the very first frame — exactly like before.
  const exteriorOpacity = 1;

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: STAGE_W,
        height: STAGE_H,
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
    >
      <div className="relative size-full overflow-hidden">
        {/* ====== LAYER 1 — Fixed background (sky + headline) ======
            Stays static while user scrolls. Visible to the user only
            through the cabin windows (mask) until LAYER 2 zooms out. */}
        {!hidden.background && <div className="absolute inset-0 -m-20">
          <img alt="" className="absolute inset-0 size-full object-cover" src={imgCloudBackground} />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(5,78,114,0.35)] via-[rgba(3,81,116,0.5)] to-[rgba(0,83,117,0.25)] mix-blend-overlay" />
        </div>}

        {/* Welcome overlay — sits in LAYER 1 (behind the plane canvas) so
            it's only visible through the window cutouts, as if the user is
            reading it from outside the window. */}
        {/* Welcome layer — width + font sizes are LOCKED to the peak
            keyframe (KF[3].welcome = 978) so only opacity animates. */}
        {!hidden.welcome && <div
          data-welcome-overlay
          className="absolute flex flex-col items-center left-1/2 top-1/2 text-center pointer-events-none"
          style={{
            width: 978,
            opacity: welcomeOpacityRaw,
            transform: `translate(-50%, calc(-50% + ${welcomeOffsetY}px))`,
            willChange: "transform, opacity",
            transition: `opacity ${transitionMs}ms linear`,
          }}
        >
          <p
            className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-white mb-4"
            style={{ fontSize: `${(54 / 733.5) * 978}px`, lineHeight: 1.2 }}
          >
            {texts.welcomeTitle}
          </p>
          <p
            className="font-['Montserrat:Medium',sans-serif] font-medium text-white/90 [text-shadow:0_3px_3px_rgba(0,0,0,0.25)]"
            style={{ fontSize: `${(18 / 733.5) * 978}px`, lineHeight: 1.5 }}
          >
            {texts.welcomeSubtitle}
          </p>
          <div className="mt-8 overflow-hidden relative" style={{ width: (124.5 / 733.5) * 978, height: (55 / 733.5) * 978 }}>
            <img alt="" className="absolute h-[155.96%] left-[-15.26%] max-w-none top-[-27.42%] w-[130.53%]" src={imgLogo161} />
          </div>
        </div>}

        {/* ====== LAYER 2 — Foreground plane canvas (scales with scroll) ======
            Starts zoomed-in onto the middle window (mask reveals LAYER 1
            through it as the shade slides up), then zooms out to expose
            all 3 windows + the cabin/fuselage + header. */}
        {!hidden.plane && <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: planeW,
            height: planeH,
            transform: "translate(-50%, -50%)",
            opacity: exteriorOpacity,
            willChange: reducedMotion ? "auto" : "width, height",
            transition: reducedMotion
              ? `width ${transitionMs}ms ease, height ${transitionMs}ms ease, opacity ${transitionMs}ms ease`
              : `opacity ${transitionMs}ms ease`,
          }}
        >
          {/* 3 Windows positioned across the canvas */}
          {[383.46, 4966.32, 9736.24].map((x, i) => (
            <Window
              key={i}
              leftPct={(x / 13468) * 100}
              widthPct={(3385.615 / 13468) * 100}
              topPct={((3432.47) / 9577.244) * 100}
              heightPct={(3774.415 / 9577.244) * 100}
              openProgress={openProgress}
              transitionMs={reducedMotion ? transitionMs : 0}
              shadeSrc={images.shade}
              handleSrc={images.handle}
            />
          ))}

          {/* Closing message */}
          {!hidden.closing && <div
            className="absolute -translate-x-1/2 text-center"
            style={{
              left: `${((4601.57 + 4274.22 / 2) / 13468) * 100}%`,
              top: `${(7454.16 / 9577.244) * 100}%`,
              width: `${(4274.22 / 13468) * 100}%`,
              opacity: closingOpacity,
            transition: `opacity ${transitionMs}ms ease`,
            }}
          >
            <p
              className="font-['Montserrat:Regular',sans-serif] text-[#f5f5f4]"
              style={{ fontSize: `${(149.644 / 13468) * planeW}px`, lineHeight: 1.5 }}
            >
              {texts.enjoyParagraph}
            </p>
          </div>}
        </div>}

        {/* Plane exterior fuselage — sits over the cloud at the same size
            as the plane-window canvas so the 3 elliptical cutouts align
            exactly to each cabin window's white frame. The ceiling
            (overhead bins, PSU strip), floor band, and dado line are all
            baked into this same SVG, so they live on the SAME canvas as
            the windows and frame — visible as one integrated cabin piece
            once the camera zooms out far enough to see them. */}
        {!hidden.exterior && <ExteriorFuselage
          opacity={exteriorOpacity}
          transitionMs={transitionMs}
          width={planeW}
          height={planeH}
        />}

        {/* Scroll hint */}
        {!hidden.scrollHint && <div
          className="absolute left-1/2 -translate-x-1/2 bottom-12 flex items-center gap-3 pointer-events-none z-10"
          style={{ opacity: scrollHintOpacity, transition: `opacity ${transitionMs}ms linear` }}
        >
          <div className={`h-[40px] w-[26px] ${reducedMotion ? "" : "animate-bounce"}`}>
            <ChevronDown className="size-full text-white" strokeWidth={2} />
          </div>
          <p className="font-['Montserrat:Medium',sans-serif] font-medium text-white text-sm tracking-wide">
            {texts.scrollDownLabel}
          </p>
        </div>}

        {!hidden.header && <div style={{ opacity: sceneRevealed, transition: `opacity ${transitionMs}ms ease` }}>
          <Header isMobile={isMobile} brandTitle={texts.brandTitle} brandTagline={texts.brandTagline} />
        </div>}
      </div>
    </div>
  );
}

function Window({
  leftPct,
  widthPct,
  topPct,
  heightPct,
  openProgress,
  transitionMs = 0,
  shadeSrc,
  handleSrc,
}: {
  leftPct: number;
  widthPct: number;
  topPct: number;
  heightPct: number;
  openProgress: number;
  transitionMs?: number;
  shadeSrc: string;
  handleSrc: string;
}) {
  // Pixel-perfect Figma node 31643:28078 — direction REVERSED so the sash
  // (with handle) starts at the top (closed) and slides DOWN to open, which
  // matches how a real plane-window shade behaves.
  // Sash (340×65) Figma percentages relative to 939×864:
  //   closed (sash up): top 13.19%, left 33.44%, w 36.21%, h 7.53%
  //   open   (sash down): top 76.5%
  const sashLeftPct = 33.44;
  const sashWidthPct = 36.21;
  const sashHeightPct = 7.53;
  // Closed position aligned to the baked-in handle of the new closed-window
  // PNG so the overlay sash+handle starts exactly on top of the painted
  // handle (one visual handle), then travels the same straight path up to
  // the open position. Movement stays locked to the cabin's % coordinate
  // system, so it scales 1:1 with the parallax zoom-out across all keyframes.
  // Closed = shade fills the entire window area (sash bottom edge at 100%),
  // so the shade covers the window completely with no gap at the bottom.
  const sashTopClosedPct = 100 - 7.53;
  const sashTopOpenPct = 13.19;
  const sashTopPct = lerp(sashTopClosedPct, sashTopOpenPct, openProgress);
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
      }}
    >
      {/* OUTER FRAME — the white plastic bezel that sits flush with the
          cabin sidewall cutout. Filled with a soft top-highlight / bottom-
          shadow gradient to read as a beveled plastic ring. */}
      <div
        data-window-inner
        className="relative"
        style={{
          aspectRatio: "939 / 864",
          maxWidth: "100%",
          maxHeight: "100%",
          width: "100%",
          borderRadius: "50% / 50%",
          overflow: "hidden",
          background:
            "radial-gradient(120% 120% at 50% 0%, #ffffff 0%, #f3f3f1 38%, #d8d6d1 78%, #b9b6af 100%)",
          // Subtle outer shadow into the cabin wall + inner ring shading on
          // the bezel itself (hint of bevel) without drowning the frame.
          boxShadow:
            "0 6px 14px rgba(0,0,0,0.22), inset 0 6px 10px rgba(255,255,255,0.55), inset 0 -8px 14px rgba(0,0,0,0.18)",
        }}
      >
        {/* INNER APERTURE — the actual glass pane. Inset from the outer
            ellipse to leave the white plastic ring visible all around.
            Recessed look comes from a strong inset shadow on this layer. */}
        <div
          className="absolute overflow-hidden"
          style={{
            // Bezel thickness ≈ 7% of width on the sides, slightly thicker
            // top/bottom to mimic the real plastic frame proportions.
            left: "7%",
            right: "7%",
            top: "8%",
            bottom: "8%",
            borderRadius: "50% / 50%",
            boxShadow:
              "inset 0 8px 14px rgba(0,0,0,0.45), inset 0 -4px 10px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(0,0,0,0.18)",
            background: "transparent",
          }}
        >
          {/* Open-state: aperture is TRANSPARENT so LAYER 1 (sky + headline)
              shows through. The shade slides up to reveal it. */}
          <div className="absolute inset-0" />

          {/* Closed-state shade — clipped to the inner oval and retracts
              upward as the sash moves. */}
          <div
            className="absolute left-0 right-0 top-0 overflow-hidden pointer-events-none bg-[#ece9e0]"
            style={{
              height: `${sashTopPct + sashHeightPct}%`,
              transition: transitionMs ? `height ${transitionMs}ms ease` : undefined,
            }}
          >
            <img
              alt=""
              className="absolute left-0 top-0 w-full max-w-none pointer-events-none object-cover"
              style={{
                height: `${(100 / (sashTopPct + sashHeightPct)) * 100}%`,
                transition: transitionMs ? `height ${transitionMs}ms ease` : undefined,
              }}
              src={shadeSrc}
            />
            <div className="absolute inset-0 shadow-[inset_2px_2px_5px_0_rgba(0,0,0,0.15)]" />
          </div>

          {/* Sliding sash + handle — rides on the bottom edge of the shade. */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${sashLeftPct}%`,
              top: `${sashTopPct}%`,
              width: `${sashWidthPct}%`,
              height: `${sashHeightPct}%`,
              transition: transitionMs ? `top ${transitionMs}ms ease` : undefined,
            }}
          >
            <img
              alt=""
              className="size-full object-contain select-none"
              src={handleSrc}
            />
          </div>

          {/* Breather / drainage hole — small dark dot near the bottom of
              the inner glass, just like a real plane window. */}
          <div
            className="absolute left-1/2 rounded-full pointer-events-none"
            style={{
              bottom: "6%",
              width: "1.6%",
              aspectRatio: "1 / 1",
              transform: "translateX(-50%)",
              background: "#1a1a1a",
              boxShadow:
                "inset 0 1px 1px rgba(255,255,255,0.25), 0 0 1px rgba(0,0,0,0.6)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ExteriorFuselage({
  opacity,
  transitionMs,
  width,
  height,
}: {
  opacity: number;
  transitionMs: number;
  width: number;
  height: number;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{
        width,
        height,
        transform: "translate(-50%, -50%)",
        opacity,
        transition: `opacity ${transitionMs}ms ease`,
      }}
    >
      <svg
        viewBox={`0 0 ${PLANE_VB_W} ${PLANE_VB_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <defs>
          {/* Cabin wall: cool pearl-grey sidewall with subtle top/bottom
              shading, evoking a modern wide-body interior. */}
          <linearGradient id="cabin-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9bcc2" />
            <stop offset="0.18" stopColor="#d8dade" />
            <stop offset="0.5" stopColor="#e6e7ea" />
            <stop offset="0.82" stopColor="#cdd0d5" />
            <stop offset="1" stopColor="#9aa0a8" />
          </linearGradient>
          {/* Subtle vignette around each window so it reads as recessed
              into the cabin wall. */}
          <radialGradient id="window-recess" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.25" />
          </radialGradient>
          {/* Thin paneling seam line. */}
          <linearGradient id="seam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.5" stopColor="#000" stopOpacity="0.10" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          {/* Overhead bin: soft platinum panel with a top-down highlight so
              the ceiling reads as a solid 3D piece, not a flat shadow. */}
          <linearGradient id="overhead-bin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0"    stopColor="#a6abb3" />
            <stop offset="0.45" stopColor="#cfd3d9" />
            <stop offset="1"    stopColor="#878d96" />
          </linearGradient>
          {/* Soft drop shadow under the bin lip onto the cabin wall. */}
          <linearGradient id="bin-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.35" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          {/* Floor: warm walnut-plank tone with a subtle highlight band on
              top, giving a richer, more contemporary cabin floor. */}
          <linearGradient id="cabin-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0"   stopColor="#7a5a3c" />
            <stop offset="0.5" stopColor="#553c25" />
            <stop offset="1"   stopColor="#2f2114" />
          </linearGradient>
        </defs>

        {/* Cabin wall with OVAL (elliptical) window cutouts. The cutout
            silhouette must match the inner <Window> border-radius (50%/50%)
            pixel-for-pixel so the white window frame sits exactly on the
            cutout edge. */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          fill="url(#cabin-wall)"
          d={`M0,0 H${PLANE_VB_W} V${PLANE_VB_H} H0 Z ${INNER_WINDOW_RECTS.map(
            (r) => {
              const rx = r.width / 2;
              const ry = r.height / 2;
              const cx = r.left + rx;
              const cy = r.top + ry;
              // Two-arc full ellipse, drawn as a closed sub-path.
              return `M ${cx - rx},${cy} A ${rx},${ry} 0 1 0 ${cx + rx},${cy} A ${rx},${ry} 0 1 0 ${cx - rx},${cy} Z`;
            },
          ).join(" ")}`}
        />

        {/* Ceiling + floor + paneling seams — grouped together and bound
            explicitly to the SAME `opacity` that drives the exterior frame's
            entry point, so they always appear/disappear in lockstep with the
            cabin frame regardless of how `opacity` is computed upstream. */}
        <g opacity={opacity} data-cabin-chrome>
          {/* === CEILING === Overhead bin row as a solid beige panel
              (clearly visible above the windows), with a thin PSU strip
              underneath and a soft drop shadow onto the sidewall. */}
          <rect x="0" y="0" width={PLANE_VB_W} height={PLANE_VB_H * 0.22}
                fill="url(#overhead-bin)" />
          {/* PSU strip (reading lights / call buttons line) */}
          <rect x="0" y={PLANE_VB_H * 0.22} width={PLANE_VB_W} height={PLANE_VB_H * 0.018}
                fill="#2c2418" opacity="0.85" />
          {/* Tiny PSU lights along the strip */}
          {Array.from({ length: 18 }).map((_, i) => {
            const cx = (i + 0.5) * (PLANE_VB_W / 18);
            return (
              <circle key={`psu-${i}`} cx={cx} cy={PLANE_VB_H * 0.229}
                      r={PLANE_VB_W * 0.0025} fill="#f6e6b8" opacity="0.9" />
            );
          })}
          {/* Soft shadow falling from the bin lip onto the cabin wall */}
          <rect x="0" y={PLANE_VB_H * 0.238} width={PLANE_VB_W}
                height={PLANE_VB_H * 0.05} fill="url(#bin-shadow)" />
          {/* Bin-divider seams (vertical lines along the overhead row) */}
          {Array.from({ length: 9 }).map((_, i) => {
            const cx = (i + 1) * (PLANE_VB_W / 10);
            return (
              <rect key={`bin-seam-${i}`} x={cx - 2} y="0" width="4"
                    height={PLANE_VB_H * 0.22} fill="#000" opacity="0.18" />
            );
          })}

          {/* === FLOOR === Dark carpet/floor band below the windows. */}
          <rect x="0" y={PLANE_VB_H * 0.84} width={PLANE_VB_W}
                height={PLANE_VB_H * 0.16} fill="url(#cabin-floor)" />
          {/* Dado seam between sidewall and floor */}
          <rect x="0" y={PLANE_VB_H * 0.838} width={PLANE_VB_W} height="6"
                fill="#1a1410" opacity="0.7" />

          {/* Vertical paneling seams removed — at high zoom they read as a
              full-height black line through the sky. */}
        </g>

        {/* Recessed shadow ring around each oval window cutout */}
        {INNER_WINDOW_RECTS.map((r, i) => {
          const pad = 380;
          return (
            <ellipse
              key={`recess-${i}`}
              cx={r.left + r.width / 2}
              cy={r.top + r.height / 2}
              rx={r.width / 2 + pad}
              ry={r.height / 2 + pad}
              fill="url(#window-recess)"
            />
          );
        })}

        {/* Invisible measurement rects — used by the alignCheck dev hook
            to verify the cutouts line up with each cabin window's frame. */}
        {INNER_WINDOW_RECTS.map((r, i) => (
          <rect
            key={i}
            data-exterior-cutout
            x={r.left}
            y={r.top}
            width={r.width}
            height={r.height}
            fill="none"
            stroke="none"
            pointerEvents="none"
          />
        ))}
      </svg>
    </div>
  );
}

function Header({ isMobile = false, brandTitle = "FlyCham", brandTagline = "CHAMMILES" }: { isMobile?: boolean; brandTitle?: string; brandTagline?: string }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-6 flex items-center justify-between z-50 px-4"
      style={{ width: isMobile ? "min(100%, 100vw)" : 1340, maxWidth: "100vw" }}
    >
      <div className="flex items-center gap-2">
        <Plane className="size-7 text-white" />
        <div className="flex flex-col leading-none">
          <span className="font-['Montserrat:Bold',sans-serif] font-bold text-white text-sm tracking-wide">{brandTitle}</span>
          <span className="font-['Montserrat:Medium',sans-serif] text-white/80 text-[10px] tracking-widest">{brandTagline}</span>
        </div>
      </div>
      <div className="hidden md:flex gap-3 items-center text-white text-sm font-['Montserrat:Medium',sans-serif] font-medium">
        {["About", "Tiers and Benefits", "Early Bird"].map((l) => (
          <span key={l} className="px-2 py-3 cursor-pointer hover:opacity-80">{l}</span>
        ))}
        {["Contact us", "About Fly Cham"].map((l) => (
          <span key={l} className="px-2 py-3 flex gap-2 items-center cursor-pointer hover:opacity-80">
            {l}
            <ExternalLink className="size-4" />
          </span>
        ))}
      </div>
      {isMobile && (
        <button
          aria-label="Open menu"
          className="flex flex-col gap-1 p-2 text-white"
        >
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
        </button>
      )}
    </div>
  );
}
