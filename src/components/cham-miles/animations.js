export const getHeaderVariants = (gradientEndDelay, smoothEase) => ({
    hidden: {
        opacity: 0,
        y: -24,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            delay: gradientEndDelay,
            duration: 0.55,
            ease: smoothEase,
            staggerChildren: 0.08,
        },
    },
});

export const getHeaderItemVariants = (smoothEase) => ({
    hidden: {
        opacity: 0,
        y: -14,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.45,
            ease: smoothEase,
        },
    },
});

export const getHeroContainerVariants = (gradientEndDelay) => ({
    hidden: {},
    visible: {
        transition: {
            delayChildren: gradientEndDelay + 0.1,
        },
    },
});

export const getTitleVariants = (smoothEase) => ({
    hidden: {
        opacity: 0,
        scale: 0.85,
        y: 32,
        filter: 'blur(6px)',
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
            duration: 0.9,
            ease: smoothEase,
        },
    },
});

export const getScrollVariants = (gradientEndDelay, smoothEase) => ({
    hidden: {
        opacity: 0,
        y: 18,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            delay: gradientEndDelay + 0.95,
            duration: 0.55,
            ease: smoothEase,
        },
    },
});
