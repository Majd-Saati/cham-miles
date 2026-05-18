export const NAV_LINKS = [
    { label: 'About', href: '#about', external: false },
    { label: 'Benefits', href: '#benefits', external: false },
    { label: 'Early Bird', href: '#early-bird', external: false },
    { label: 'Contact us', href: '#contact', external: true },
    { label: 'About Fly Cham', href: '#about-fly-cham', external: true },
];

export const HERO_CONTENT = {
    title: 'Welcome to Cham Miles',
    description:
        'Your journey with FlyCham becomes more rewarding from the moment you join with our loyalty program',
    scrollLabel: 'scroll down',
};

export const SECOND_LAYER_CONTENT = {
    eyebrow: 'Step into',
    titleStart: 'Your ',
    titleAccent: 'Premium ',
    titleEnd: 'journey',
    description:
        'Enjoy priority services, seamless bookings, personalized travel experiences, and exclusive member-only access all for free.',
    scrollLabel: 'scroll down',
};

export const ANIMATION_CONFIG = {
    gradientDelay: 0.8,
    gradientDuration: 0.5,
    /** Second scrim in `BackgroundLayers`; must match that component’s last motion transition. */
    secondOverlayDuration: 0.5,
    smoothEase: [0.22, 1, 0.36, 1],
};
