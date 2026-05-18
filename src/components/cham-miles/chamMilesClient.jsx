import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useScroll, useTransform, useSpring, motion, useMotionValueEvent } from 'framer-motion';
import FirstLayer from './Components/FirstLayer';
import SecondLayer from './Components/SecondLayer';
import HeroHeader from './Components/HeroHeader';
import { NAV_LINKS, SECOND_LAYER_CONTENT, ANIMATION_CONFIG } from './constants';
import {
    getHeaderItemVariants,
    getHeaderVariants,
    getScrollVariants,
} from './animations';

const SAFETY_GRADIENT =
    'linear-gradient(180deg, rgb(0, 83, 117) 0%, rgb(18, 18, 18) 100%)';

/**
 * Initial zoom of the SecondLayer (window frame) at scroll progress = 0.
 * Tweak this single value to change how zoomed-in the windows appear before
 * the user starts scrolling. Must be >= 1 (1 = natural layout, no zoom).
 */
export const DEFAULT_INITIAL_ZOOM = 11;
export const MIN_INITIAL_ZOOM = 1;
export const MAX_INITIAL_ZOOM = 15;

/**
 * Both layers stacked. SecondLayer starts zoomed in significantly so the
 * FirstLayer peeks through the window openings. As the user scrolls, the
 * SecondLayer's scale decreases smoothly toward 1, revealing the full
 * premium-journey layout.
 */
export default function ChamMilesClient() {
    const scrollRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: scrollRef,
        offset: ['start start', 'end end'],
    });

    const { smoothEase } = ANIMATION_CONFIG;
    const headerVariants = getHeaderVariants(0, smoothEase);
    const headerItemVariants = getHeaderItemVariants(smoothEase);
    const scrollVariants = getScrollVariants(0, smoothEase);

    // Smooth the raw scroll progress so every derived motion feels cinematic.
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 120,
        damping: 28,
        mass: 0.4,
    });

    // ───── User-tunable initial zoom (focus on the centered middle window) ─────
    const [initialZoom, setInitialZoom] = useState(DEFAULT_INITIAL_ZOOM);
    const [originY, setOriginY] = useState(50); // % vertical focal point (middle window)
    const [originX, setOriginX] = useState(50); // % horizontal focal point

    // Scroll-driven zoom: starts at `initialZoom` and shrinks to 1 by ZOOM_END.
    const ZOOM_END = 0.8;
    const secondLayerScale = useTransform(smoothProgress, (v) => {
        const t = Math.max(0, Math.min(1, v / ZOOM_END));
        return Math.max(1, initialZoom - t * (initialZoom - 1));
    });
    // Keep the safety gradient backdrop fully opaque at ALL times. The
    // sticky parent already paints the same gradient, but a dedicated
    // always-on layer underneath the scaled SecondLayer guarantees that no
    // white frame can ever appear during the GPU compositor handoff while
    // scaling — which was the real cause of the flashing.
    const safetyBackdropOpacity = 1;

    // Hide FirstLayer once the SecondLayer scrim fully covers the viewport.
    // Fade completes well BEFORE the unmount threshold (60.37%) so the
    // unmount happens on an already-invisible element — no visual pop.
    const firstLayerOpacity = useTransform(
        smoothProgress,
        [0, 0.50, 0.55, 1],
        [1, 1, 0, 0]
    );

    // Shutter is already fully open from the start — no closed-glass beat.
    const shutterHeight = useTransform(smoothProgress, [0, 1], ['0%', '0%']);

    // ───── Debug overlay ─────
    // Toggle with the "D" key (outside inputs) or by appending ?debug=1.
    // Tracks raw + smoothed scroll progress, current scale, scroll Y, viewport
    // size and the SecondLayer's bounding box so you can see exactly what's
    // happening when the scene visually breaks.
    const [debug, setDebug] = useState(false);
    const [rawP, setRawP] = useState(0);
    const [smoothP, setSmoothP] = useState(0);
    const [scaleVal, setScaleVal] = useState(DEFAULT_INITIAL_ZOOM);
    const [introDone, setIntroDone] = useState(false);

    // Lock page scroll until the FirstLayer hero intro animation finishes.
    useEffect(() => {
        if (typeof document === 'undefined') return;
        if (introDone) return;
        const prevHtml = document.documentElement.style.overflow;
        const prevBody = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = prevHtml;
            document.body.style.overflow = prevBody;
        };
    }, [introDone]);

    const handleHeroIntroComplete = useCallback(() => setIntroDone(true), []);
    const [showFirstLayer, setShowFirstLayer] = useState(true);
    const [scrollY, setScrollY] = useState(0);
    const [viewport, setViewport] = useState({ w: 0, h: 0 });
    const [secondRect, setSecondRect] = useState({ w: 0, h: 0, top: 0, left: 0 });
    const [copied, setCopied] = useState(false);
    const secondLayerRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === '1') setDebug(true);
        const onKey = (e) => {
            if (e.key !== 'd' && e.key !== 'D') return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            setDebug((v) => !v);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Only sync motion values into React state when the debug panel is open.
    // Otherwise every scroll tick re-renders the whole tree (including
    // FirstLayer), which is what causes the perceived flashing.
    useMotionValueEvent(scrollYProgress, 'change', (v) => {
        if (debug) setRawP(v);
    });
    useMotionValueEvent(smoothProgress, 'change', (v) => {
        if (debug) setSmoothP(v);
    });
    useMotionValueEvent(secondLayerScale, 'change', (v) => {
        if (debug) setScaleVal(v);
    });

    // FirstLayer is always mounted — toggling its mount state caused the
    // hero ("Welcome to Cham Miles") to flash on/off as the spring oscillated
    // around the threshold. It stays in the DOM behind the SecondLayer.

    useEffect(() => {
        if (!debug) return;
        const update = () => {
            setScrollY(window.scrollY);
            setViewport({ w: window.innerWidth, h: window.innerHeight });
            const el = secondLayerRef.current;
            if (el) {
                const r = el.getBoundingClientRect();
                setSecondRect({
                    w: Math.round(r.width),
                    h: Math.round(r.height),
                    top: Math.round(r.top),
                    left: Math.round(r.left),
                });
            }
        };
        update();
        const id = setInterval(update, 100);
        window.addEventListener('resize', update);
        return () => {
            clearInterval(id);
            window.removeEventListener('resize', update);
        };
    }, [debug]);

    const copySnapshot = async () => {
        const snapshot = {
            rawProgress: +rawP.toFixed(4),
            smoothProgress: +smoothP.toFixed(4),
            scale: +scaleVal.toFixed(4),
            scrollY,
            viewport,
            secondLayerRect: secondRect,
            warnings: {
                scaleBelow1: scaleVal < 1,
                progressOutOfRange: rawP < 0 || rawP > 1 || smoothP < 0 || smoothP > 1,
                secondLayerSmallerThanViewport:
                    secondRect.w < viewport.w || secondRect.h < viewport.h,
                secondLayerOffset: secondRect.top > 0 || secondRect.left > 0,
            },
            timestamp: new Date().toISOString(),
        };
        const text = JSON.stringify(snapshot, null, 2);
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    return (
        <div ref={scrollRef} className="relative w-full" style={{ height: '300vh' }}>
            <div
                className="sticky top-0 h-screen w-full overflow-hidden"
            >


                {/* Layer 1: hero (sky + wing + Welcome text) — always visible
                    through window holes, never re-rendered or unmounted. */}
                <div className="absolute inset-0 z-0">
                    <MemoFirstLayer
                        onEnterAnimationComplete={handleHeroIntroComplete}
                        scrollProgress={smoothProgress}
                    />
                </div>

                {/* Layer 2: zoomed window overlay, scale decreases on scroll */}

                <motion.div
                    ref={secondLayerRef}
                    className="absolute inset-0 will-change-transform"
                    style={{
                        scale: secondLayerScale,
                        transformOrigin: `${originX}% ${originY}%`,
                    }}
                >
                    <SecondLayer
                        navLinks={NAV_LINKS}
                        headerVariants={headerVariants}
                        headerItemVariants={headerItemVariants}
                        scrollVariants={scrollVariants}
                        content={SECOND_LAYER_CONTENT}
                        shutterHeight={shutterHeight}
                    />
                </motion.div>

                {/* Initial-zoom control (always visible, top-left) */}
      

                {/* Fixed header on top, unaffected by the zoom */}
                <div className="absolute inset-x-0 top-0 z-50 mx-auto w-full max-w-[1440px] px-6 md:px-12">
                    <HeroHeader
                        navLinks={NAV_LINKS}
                        headerVariants={headerVariants}
                        headerItemVariants={headerItemVariants}
                    />
                </div>

 
            </div>
        </div>
    );
}

function Row({ k, v, warn }) {
    return (
        <div className="flex items-center justify-between gap-2 py-[2px]">
            <span className="text-white/70">{k}</span>
            <span className={`tabular-nums ${warn ? 'rounded bg-red-500/80 px-1 text-white' : 'text-emerald-200'}`}>
                {v}
            </span>
        </div>
    );
}

// FirstLayer is purely a function of its props; memoizing prevents it from
// re-rendering when the parent re-renders due to slider/debug state changes.
const MemoFirstLayer = memo(FirstLayer);
