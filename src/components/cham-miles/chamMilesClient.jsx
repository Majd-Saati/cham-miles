import { useEffect, useRef, useState } from 'react';
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

    // Continuous scroll-driven zoom:
    //  - SecondLayer (window frame + composed layout) starts massively zoomed
    //    in (window opening fills the viewport, framing the hero) and shrinks
    //    smoothly to its natural 1x layout as the user scrolls.
    //  - FirstLayer (Welcome + wing) translates upward at the same time so
    //    the headline drifts out the top of the window opening, leaving only
    //    the sky/wing visible inside the windows by the end.
    // Clamp progress to [0,1] so spring overshoot never drops scale below 1
    // (which would shrink the SecondLayer below the viewport and expose
    // the FirstLayer around its edges).
    // Finish the zoom at 80% of scroll, then hold scale=1 for the remaining
    // 20% buffer. Without this hold, the scale animation finishes at the
    // exact same moment the sticky parent releases, causing a one-frame
    // flash between "scaled, mid-air" and "sticky releasing, sliding up".
    const ZOOM_END = 0.8;
    // Single scale value drives BOTH layers together — they live inside the
    // same scaling wrapper so there is no relative motion between the scrim's
    // window-mask and the FirstLayer behind it. That removes every possible
    // handoff seam (the original cause of flashing).
    const sceneScale = useTransform(smoothProgress, (v) => {
        const t = Math.max(0, Math.min(1, v / ZOOM_END));
        return Math.max(1, 9.5 - t * 8.5);
    });

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
    const [scaleVal, setScaleVal] = useState(9.5);
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

    useMotionValueEvent(scrollYProgress, 'change', (v) => setRawP(v));
    useMotionValueEvent(smoothProgress, 'change', (v) => setSmoothP(v));
    useMotionValueEvent(sceneScale, 'change', (v) => setScaleVal(v));

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
                style={{ background: SAFETY_GRADIENT }}
            >
                {/* Single scaling stage. FirstLayer + SecondLayer scale as
                    one rigid unit — the scrim's window-mask naturally reveals
                    FirstLayer through the windows at every scale, with zero
                    relative motion between them. No handoff, no flash. */}
                <motion.div
                    ref={secondLayerRef}
                    className="absolute inset-0 will-change-transform"
                    style={{
                        scale: sceneScale,
                        transformOrigin: '50% 48%',
                    }}
                >
                    {/* Behind the scrim — only visible through window holes */}
                    <div className="absolute inset-0 z-0">
                        <FirstLayer />
                    </div>

                    {/* Scrim + window frames + headline copy */}
                    <div className="absolute inset-0 z-10">
                        <SecondLayer
                            navLinks={NAV_LINKS}
                            headerVariants={headerVariants}
                            headerItemVariants={headerItemVariants}
                            scrollVariants={scrollVariants}
                            content={SECOND_LAYER_CONTENT}
                            shutterHeight={shutterHeight}
                        />
                    </div>
                </motion.div>

                <div className="absolute inset-x-0 top-0 z-50 mx-auto w-full max-w-[1440px] px-6 md:px-12">
                    <HeroHeader
                        navLinks={NAV_LINKS}
                        headerVariants={headerVariants}
                        headerItemVariants={headerItemVariants}
                    />
                </div>

                {debug && (
                    <div className="pointer-events-auto fixed bottom-4 right-4 z-[9999] w-[290px] rounded-lg bg-black/85 p-3 font-mono text-[11px] leading-tight text-white shadow-2xl backdrop-blur-sm">
                        <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/20 pb-1">
                            <span className="font-semibold tracking-wide text-emerald-300">CHAMMILES DEBUG</span>
                            <button
                                type="button"
                                onClick={copySnapshot}
                                className={`rounded px-2 py-[2px] text-[10px] ${copied ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                title="Copy debug snapshot as JSON"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <Row k="raw progress"     v={`${(rawP * 100).toFixed(2)}%`} warn={rawP < 0 || rawP > 1} />
                        <Row k="smooth progress"  v={`${(smoothP * 100).toFixed(2)}%`} warn={smoothP < 0 || smoothP > 1} />
                        <Row k="scale"            v={scaleVal.toFixed(3)} warn={scaleVal < 1} />
                        <Row k="window scrollY"   v={`${scrollY}px`} />
                        <Row k="viewport"         v={`${viewport.w}×${viewport.h}`} />
                        <Row
                            k="2nd layer box"
                            v={`${secondRect.w}×${secondRect.h}`}
                            warn={secondRect.w < viewport.w || secondRect.h < viewport.h}
                        />
                        <Row
                            k="2nd layer top/left"
                            v={`${secondRect.top},${secondRect.left}`}
                            warn={secondRect.top > 0 || secondRect.left > 0}
                        />
                        <div className="mt-2 border-t border-white/20 pt-1 text-[10px] text-white/60">
                            warnings highlight when SecondLayer fails to fully cover the viewport
                            (the cause of edge-flash bugs).
                        </div>
                    </div>
                )}
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
