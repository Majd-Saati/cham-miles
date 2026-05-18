import { useId, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from './HeroHeader';
import ScrollIndicator from './ScrollIndicator';
import windowImage from '@/assets/cham-miles/window.png';

const SCRIM_GRADIENT =
    'linear-gradient(180deg, rgb(0, 83, 117) 0%, rgb(18, 18, 18) 100%)';

/**
 * Opening is relative to the painted PNG bitmap (img getBoundingClientRect),
 * not the slot div — fixes drift when layout / aspect / object-contain shifts the image.
 * Tweak if the glass sits higher or lower in window.png.
 */
const OPENING_CX_FRAC = 0.5;
const OPENING_CY_FRAC = 0.56;
const OPENING_RX_FRAC = 0.36;
const OPENING_RY_FRAC = 0.36;

function WindowScrimMask({ id, holes }) {
    return (
        <svg
            width={1}
            height={1}
            className="pointer-events-none absolute overflow-hidden opacity-0"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <mask id={id} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
                    <rect width="1" height="1" fill="white" />
                    {holes.map((h, i) => (
                        <ellipse
                            key={`${id}-hole-${i}`}
                            cx={h.cx}
                            cy={h.cy}
                            rx={h.rx}
                            ry={h.ry}
                            fill="black"
                        />
                    ))}
                </mask>
            </defs>
        </svg>
    );
}

/** Prefer the actual rendered <img> box (object-fit: contain); fallback to slot while loading. */
function getPaintedImageRect(slotEl) {
    const img = slotEl?.querySelector?.('img');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return r;
}

function measureHoles(scrimEl, slotEls) {
    const s = scrimEl.getBoundingClientRect();
    if (s.width < 1 || s.height < 1) return [];

    const out = [];
    for (const el of slotEls) {
        if (!el) return [];
        const r = getPaintedImageRect(el) ?? el.getBoundingClientRect();
        const cxPx = r.left + r.width * OPENING_CX_FRAC - s.left;
        const cyPx = r.top + r.height * OPENING_CY_FRAC - s.top;
        const rxPx = r.width * OPENING_RX_FRAC;
        const ryPx = r.height * OPENING_RY_FRAC;
        out.push({
            cx: cxPx / s.width,
            cy: cyPx / s.height,
            rx: rxPx / s.width,
            ry: ryPx / s.height,
        });
    }
    return out;
}

export default function SecondLayer({
    navLinks,
    headerVariants,
    headerItemVariants,
    scrollVariants,
    content,
    shutterHeight,
}) {
    const uid = useId().replace(/:/g, '');
    const maskId = `${uid}-scrim`;
    const scrimRef = useRef(null);
    const slotRef0 = useRef(null);
    const slotRef1 = useRef(null);
    const slotRef2 = useRef(null);
    const slotRefs = [slotRef0, slotRef1, slotRef2];
    const measureRef = useRef(() => {});

    const [holes, setHoles] = useState(null);

    useLayoutEffect(() => {
        const scrimEl = scrimRef.current;
        if (!scrimEl) return;

        const slotEls = () => slotRefs.map((r) => r.current);

        const update = () => {
            const next = measureHoles(scrimEl, slotEls());
            if (next.length === 3) setHoles(next);
        };

        measureRef.current = update;

        update();

        const ro = new ResizeObserver(update);
        ro.observe(scrimEl);
        slotEls().forEach((el) => {
            if (!el) return;
            ro.observe(el);
            const img = el.querySelector('img');
            if (img) ro.observe(img);
        });

        const scrollRoots = [window];
        const mainScroll = document.getElementById('app-main-scroll');
        if (mainScroll) scrollRoots.push(mainScroll);

        scrollRoots.forEach((t) => t.addEventListener('scroll', update, { capture: true, passive: true }));
        window.addEventListener('resize', update);

        return () => {
            ro.disconnect();
            scrollRoots.forEach((t) => t.removeEventListener('scroll', update, true));
            window.removeEventListener('resize', update);
        };
    }, []);

    const maskRef = `url(#${maskId})`;
    const activeHoles = holes ?? [];

    return (
        <section className="relative isolate min-h-[100vh] w-full overflow-hidden">
            <WindowScrimMask id={maskId} holes={activeHoles} />

            <div
                ref={scrimRef}
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                    background: SCRIM_GRADIENT,
                    ...(activeHoles.length === 3
                        ? {
                              WebkitMaskImage: maskRef,
                              maskImage: maskRef,
                              WebkitMaskRepeat: 'no-repeat',
                              maskRepeat: 'no-repeat',
                              WebkitMaskSize: '100% 100%',
                              maskSize: '100% 100%',
                          }
                        : {}),
                }}
            />

            <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 md:px-12">
                <HeroHeader
                    navLinks={navLinks}
                    headerVariants={headerVariants}
                    headerItemVariants={headerItemVariants}
                />

                <div className="pt-14 md:pt-16">
                    <div className="max-w-[620px]">
                        <p className="text-[#F5F5F4] text-[20px] leading-none font-medium">{content.eyebrow}</p>
                        <h2 className="mt-3 text-[#F5F5F4] text-[56px] md:text-6xl font-bold leading-[0.96] tracking-tight">
                            <span>{content.titleStart}</span>
                            <span className="text-[#BAA981]">{content.titleAccent}</span>
                            <span>{content.titleEnd}</span>
                        </h2>
                    </div>

                    <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 lg:gap-14 items-end">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="flex justify-center">
                                <div
                                    ref={slotRefs[item]}
                                    className="relative w-[220px] md:w-[290px] lg:w-[330px]"
                                    style={{ aspectRatio: '362 / 404' }}
                                >
                                    {/* Closed-glass shutter behind the window frame.
                                        Outer box clips to the window opening shape;
                                        inner motion.div shrinks in height (anchored
                                        top) so the bottom of the glass clears first. */}
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute overflow-hidden rounded-[44%]"
                                        style={{
                                            left: `${(OPENING_CX_FRAC - OPENING_RX_FRAC) * 100}%`,
                                            top: `${(OPENING_CY_FRAC - OPENING_RY_FRAC) * 100}%`,
                                            width: `${OPENING_RX_FRAC * 2 * 100}%`,
                                            height: `${OPENING_RY_FRAC * 2 * 100}%`,
                                        }}
                                    >
                                        <motion.div
                                            className="absolute left-0 top-0 w-full"
                                            style={{
                                                height: shutterHeight ?? '100%',
                                                background:
                                                    'linear-gradient(180deg, #f4f4f2 0%, #d9d9d6 100%)',
                                                boxShadow:
                                                    'inset 0 0 30px rgba(255,255,255,0.6), inset 0 0 60px rgba(0,0,0,0.08)',
                                            }}
                                        />
                                    </div>
                                    <img
                                        src={windowImage}
                                        alt="Aircraft window"
                                        className="absolute inset-0 h-full w-full object-contain"
                                        onLoad={() => {
                                            requestAnimationFrame(() => measureRef.current());
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="mx-auto mt-4 max-w-[460px] text-center text-[#F5F5F4] text-[14px] md:text-[16px] leading-[1.5]">
                        {content.description}
                    </p>
                </div>
            </div>

            <ScrollIndicator label={content.scrollLabel} scrollVariants={scrollVariants} />
        </section>
    );
}
