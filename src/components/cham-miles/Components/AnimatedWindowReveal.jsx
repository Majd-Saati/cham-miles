import { motion, useTransform } from 'framer-motion';
import windowImage from '@/assets/cham-miles/window.png';

/**
 * Single airplane-window mask layered over the hero. As scroll progresses
 * the window scales from huge (filling the viewport) down to a small
 * centered frame, while a dark teal scrim fades in around it.
 *
 * The scrim has an elliptical hole that tracks the window's glass opening,
 * so the FirstLayer remains visible only through that opening — matching
 * the video reference.
 *
 * Reveal opening (relative to the painted window.png bitmap):
 *   cx = 0.5, cy = 0.56, rx = 0.36, ry = 0.36
 */
const OPENING_CX = 0.5;
const OPENING_CY = 0.56;
const OPENING_RX = 0.36;
const OPENING_RY = 0.36;

const SCRIM_GRADIENT =
    'linear-gradient(180deg, rgb(0, 83, 117) 0%, rgb(18, 18, 18) 100%)';

export default function AnimatedWindowReveal({ scrollYProgress, maskId = 'window-reveal-mask' }) {
    // Window image grows from very large to small as we scroll.
    // Use vmax units so it stays responsive on every viewport.
    // Starts oversized (covering >100% of the viewport), ends at a comfortable centered size.
    const windowSize = useTransform(
        scrollYProgress,
        [0, 0.55, 1],
        ['260vmax', 'clamp(220px, 22vw, 360px)', 'clamp(220px, 22vw, 360px)']
    );

    // Hole radius for the mask: starts huge (covering everything → hero fully visible),
    // shrinks as scrim fades in so dark frame appears around window.
    // These are fractions of the window image's bounding box.
    const holeRX = OPENING_RX;
    const holeRY = OPENING_RY;

    // Convert windowSize → fraction of viewport for mask sizing.
    // We anchor the mask hole to the window image position (always centered).
    return (
        <div className="pointer-events-none absolute inset-0 z-20">
            {/* Inline SVG mask definition */}
            <svg
                width={0}
                height={0}
                className="absolute"
                aria-hidden="true"
                style={{ position: 'absolute' }}
            >
                <defs>
                    <mask id={maskId} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
                        <rect width="1" height="1" fill="white" />
                        <MaskHole scrollYProgress={scrollYProgress} rx={holeRX} ry={holeRY} />
                    </mask>
                </defs>
            </svg>

            {/* Dark scrim with elliptical hole tracking the window opening */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: SCRIM_GRADIENT,
                    
                    WebkitMaskImage: `url(#${maskId})`,
                    maskImage: `url(#${maskId})`,
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskSize: '100% 100%',
                    maskSize: '100% 100%',
                }}
            />

            {/* The window frame itself, centered, scaling with scroll */}
            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                    width: windowSize,
                    aspectRatio: '362 / 404',
                }}
            >
                <img
                    src={windowImage}
                    alt=""
                    className="h-full w-full object-contain select-none"
                    draggable={false}
                />
            </motion.div>
        </div>
    );
}

/**
 * SVG ellipse whose center tracks the window image's center (always 50%, 50%
 * of the viewport since the window itself is viewport-centered). The radius
 * scales from "covers entire viewport" → "matches the window opening".
 */
function MaskHole({ scrollYProgress, rx, ry }) {
    // At progress 0 the hole is huge (1.2 in objectBoundingBox = bigger than the box),
    // so the scrim is effectively invisible (combined with scrimOpacity 0 it's a no-op).
    // As progress moves to 0.55+, the hole shrinks to the window opening size.
    // Window size in vmax → fraction of viewport is variable; we approximate by
    // mapping scroll progress directly to a hole radius that matches the window scale.
    const holeRx = useTransform(scrollYProgress, [0, 0.55, 1], [1.5, 0.11, 0.11]);
    const holeRy = useTransform(scrollYProgress, [0, 0.55, 1], [1.5, 0.13, 0.13]);

    return (
        <motion.ellipse
            cx={0.5}
            cy={0.5}
            rx={holeRx}
            ry={holeRy}
            fill="black"
        />
    );
}
