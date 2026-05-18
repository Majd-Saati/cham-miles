import { motion, useTransform } from 'framer-motion';
import windowImage from '@/assets/cham-miles/window.png';
import ScrollIndicator from './ScrollIndicator';
import { SECOND_LAYER_CONTENT, ANIMATION_CONFIG } from '../constants';
import { getScrollVariants } from '../animations';

/**
 * Final "Your Premium journey" scene.
 *
 * The center window of the trio is provided by AnimatedWindowReveal, which
 * stays parked at the center. This component only renders:
 *   - the left/right side windows that slide in from off-screen
 *   - the heading text on the upper-left
 *   - the bottom paragraph + scroll indicator
 *
 * Everything fades in over the last segment of scroll so the cabin keeps
 * its solid teal background (no opacity transition on the scrim itself).
 */
export default function FinalScene({ scrollYProgress }) {
    const { smoothEase } = ANIMATION_CONFIG;
    const content = SECOND_LAYER_CONTENT;
    const scrollVariants = getScrollVariants(0, smoothEase);

    // Side windows slide in from beyond the viewport.
    const leftX = useTransform(scrollYProgress, [0.75, 1], ['-120%', '0%']);
    const rightX = useTransform(scrollYProgress, [0.75, 1], ['120%', '0%']);

    // Text fades in once the center window has settled.
    const textOpacity = useTransform(scrollYProgress, [0.6, 0.8], [0, 1]);
    const textY = useTransform(scrollYProgress, [0.6, 0.8], [30, 0]);

    return (
        <div className="pointer-events-none absolute inset-0 z-30">
            {/* Heading block — top-left */}
            <motion.div
                className="absolute left-6 md:left-12 top-24 md:top-28 max-w-[620px]"
                style={{ opacity: textOpacity, y: textY }}
            >
                <p className="text-[#F5F5F4] text-[18px] md:text-[20px] leading-none font-medium">
                    {content.eyebrow}
                </p>
                <h2 className="mt-3 text-[#F5F5F4] text-[44px] md:text-6xl font-bold leading-[0.96] tracking-tight">
                    <span>{content.titleStart}</span>
                    <span className="text-[#BAA981]">{content.titleAccent}</span>
                    <span>{content.titleEnd}</span>
                </h2>
            </motion.div>

            {/* Side windows — slide in from off-screen */}
            <motion.div
                className="absolute left-[4%] md:left-[6%] top-1/2 -translate-y-1/2 w-[clamp(140px,16vw,260px)]"
                style={{
                    x: leftX,
                    aspectRatio: '362 / 404',
                }}
            >
                <img src={windowImage} alt="" className="h-full w-full object-contain" />
            </motion.div>
            <motion.div
                className="absolute right-[4%] md:right-[6%] top-1/2 -translate-y-1/2 w-[clamp(140px,16vw,260px)]"
                style={{
                    x: rightX,
                    aspectRatio: '362 / 404',
                }}
            >
                <img src={windowImage} alt="" className="h-full w-full object-contain" />
            </motion.div>

            {/* Bottom paragraph + scroll indicator */}
            <motion.div
                className="absolute inset-x-0 bottom-20 md:bottom-24 flex flex-col items-center px-6"
                style={{ opacity: textOpacity, y: textY }}
            >
                <p className="max-w-[460px] text-center text-[#F5F5F4] text-[14px] md:text-[16px] leading-[1.5]">
                    {content.description}
                </p>
                <div className="relative mt-6 h-12 w-full">
                    <ScrollIndicator label={content.scrollLabel} scrollVariants={scrollVariants} />
                </div>
            </motion.div>
        </div>
    );
}
