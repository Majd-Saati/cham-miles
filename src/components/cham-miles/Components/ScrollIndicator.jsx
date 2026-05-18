import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mouse } from 'lucide-react';

export default function ScrollIndicator({ label, scrollVariants }) {
    const [startMouseLoop, setStartMouseLoop] = useState(false);

    return (
        <div className="absolute bottom-24 md:bottom-24 left-1/2 -translate-x-1/2 z-10">
            <motion.button
                type="button"
                aria-label="Scroll down"
                className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                variants={scrollVariants}
                initial="hidden"
                animate="visible"
                onAnimationComplete={(definition) => {
                    if (definition === 'visible') {
                        setStartMouseLoop(true);
                    }
                }}
            >
                <motion.span
                    className="inline-flex"
                    animate={
                        startMouseLoop
                            ? {
                                  y: [-4, 4, -4],
                              }
                            : {
                                  y: 0,
                              }
                    }
                    transition={
                        startMouseLoop
                            ? {
                                  duration: 1.25,
                                  ease: 'easeInOut',
                                  repeat: Infinity,
                                  repeatType: 'loop',
                              }
                            : {
                                  duration: 0,
                              }
                    }
                >
                    <Mouse size={36} strokeWidth={2.5} aria-hidden />
                </motion.span>

                <span className="text-[17px] md:text-lg font-light leading-none">{label}</span>
            </motion.button>
        </div>
    );
}
