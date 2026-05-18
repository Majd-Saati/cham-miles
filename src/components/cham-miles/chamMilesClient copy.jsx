import { useRef } from 'react';
import { useScroll, useTransform, useSpring, motion } from 'framer-motion';
import FirstLayer from './Components/FirstLayer';
import SecondLayer from './Components/SecondLayer';
import HeroHeader from './Components/HeroHeader';
import { NAV_LINKS, SECOND_LAYER_CONTENT, ANIMATION_CONFIG } from './constants';
import {
    getHeaderItemVariants,
    getHeaderVariants,
    getScrollVariants,
} from './animations';

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

    // Three-beat scroll-driven animation:
    //  Beat 1 [0 → 0.5]: the closed glass recedes from bottom → top so the
    //    sky + headline appear through the open window.
    //  Beat 2 [0.5 → 0.65]: hold on the open window — first layer is the hero.
    //  Beat 3 [0.65 → 1]: the SecondLayer zooms out to its final composed layout.
    // Window starts already open at a strong zoom so the FirstLayer (sky +
    // headline) is the hero. Hold the zoom, then pull back to the composed
    // layout in the final beat.
    const secondLayerScale = useTransform(
        smoothProgress,
        [0, 0.5, 1],
        [9.5, 9.5, 1],
    );

    const secondLayerY = useTransform(
        smoothProgress,
        [0, 0.5, 1],
        ['-28%', '-28%', '0%'],
    );

    // Shutter is already fully open from the start — no closed-glass beat.
    const shutterHeight = useTransform(smoothProgress, [0, 1], ['0%', '0%']);

    return (
        <div ref={scrollRef} className="relative w-full" style={{ height: '300vh' }}>
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {/* Layer 1: hero behind */}
                <div className="absolute inset-0 z-0">
                    <FirstLayer />
                </div>

                {/* Layer 2: zoomed window overlay, scale decreases on scroll */}
                <motion.div
                    className="absolute inset-0 z-20 will-change-transform"
                    style={{
                        scale: secondLayerScale,
                        // y: secondLayerY,
                        transformOrigin: '50% 48%',
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
