import { useCallback, useRef } from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';
import chamMilesLogo from '@/assets/cham-miles/cham-miles-logo.png';

export default function HeroContent({
    title,
    description,
    heroContainerVariants,
    titleVariants,
    onEnterAnimationComplete,
    scrollProgress,
}) {
    const notifiedRef = useRef(false);
    const handleHeroMotionComplete = useCallback(() => {
        if (notifiedRef.current) return;
        notifiedRef.current = true;
        onEnterAnimationComplete?.();
    }, [onEnterAnimationComplete]);

    // Scroll-linked transforms. Stable fallback when no MotionValue is provided.
    const fallback = useMotionValue(0);
    const progress = scrollProgress ?? fallback;
    const y = useTransform(progress, [0, 0.6, 0.85, 1], [0, -120, -200, -200]);
    const scale = useTransform(progress, [0, 0.6, 0.85, 1], [1, 0.9, 0.86, 0.86]);
    const opacity = useTransform(progress, [0, 0.6, 0.85, 1], [1, 0.85, 0, 0]);

    return (
        <motion.div
            className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center text-center px-6 -mt-10 md:-mt-20 will-change-transform"
            variants={heroContainerVariants}
            initial="hidden"
            animate="visible"
            style={scrollProgress ? { y, scale, opacity } : undefined}
        >
            <motion.h1
                variants={titleVariants}
                className="text-white font-semibold text-[42px] md:text-7xl tracking-tight leading-none"
            >
                {title}
            </motion.h1>

            <motion.p
                variants={titleVariants}
                className="mt-5 max-w-[760px] text-white/90 text-[16px] md:text-[16px] leading-tight"
            >
                {description}
            </motion.p>

            <motion.div
                variants={titleVariants}
                className="mt-6 md:mt-7"
                onAnimationComplete={handleHeroMotionComplete}
            >
                <img
                    src={chamMilesLogo}
                    alt="ChamMiles"
                    className="h-[46px] md:h-[60px] w-auto"
                />
            </motion.div>
        </motion.div>
    );
}
