import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import bg from '@/assets/cham-miles/bg.png';
import { ANIMATION_CONFIG } from '../constants';

export default function BackgroundLayers({
    gradientDelay,
    gradientDuration,
    onBackgroundAnimationsComplete,
}) {
    const { secondOverlayDuration } = ANIMATION_CONFIG;
    const layerDoneRef = useRef({ primary: false, secondary: false });
    const notifiedRef = useRef(false);

    const tryNotifyFirstLayerComplete = useCallback(() => {
        const { primary, secondary } = layerDoneRef.current;
        if (!primary || !secondary || notifiedRef.current) return;
        notifiedRef.current = true;
        onBackgroundAnimationsComplete?.();
    }, [onBackgroundAnimationsComplete]);

    const onPrimaryGradientComplete = useCallback(() => {
        layerDoneRef.current.primary = true;
        tryNotifyFirstLayerComplete();
    }, [tryNotifyFirstLayerComplete]);

    const onSecondaryOverlayComplete = useCallback(() => {
        layerDoneRef.current.secondary = true;
        tryNotifyFirstLayerComplete();
    }, [tryNotifyFirstLayerComplete]);

    return (
        <div className="absolute inset-0">
            <img
                src={bg}
                alt="Airplane wing over clouds"
                className="absolute inset-0 h-full w-full object-cover object-center"
            />

            <motion.div
                className="absolute inset-0 mix-blend-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                    delay: gradientDelay,
                    duration: gradientDuration,
                    ease: 'easeOut',
                }}
                onAnimationComplete={onPrimaryGradientComplete}
                style={{
                    background:
                        'linear-gradient(180deg, rgba(5, 78, 114, 0.85) 0%, rgba(3, 81, 116, 0.9) 50%, rgba(0, 83, 117, 0.75) 100%)',
                }}
            />

            <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                    delay: gradientDelay + gradientDuration,
                    duration: secondOverlayDuration,
                    ease: 'easeOut',
                }}
                onAnimationComplete={onSecondaryOverlayComplete}
                style={{
                    background:
                        'linear-gradient(180deg, rgba(0, 25, 40, 0.35) 0%, rgba(0, 30, 45, 0.45) 0%, rgba(0, 20, 35, 0.55) 100%)',
                }}
            />
        </div>
    );
}
