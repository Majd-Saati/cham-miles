import { getHeroContainerVariants, getTitleVariants } from '../animations';
import { ANIMATION_CONFIG, HERO_CONTENT } from '../constants';
import BackgroundLayers from './BackgroundLayers';
import HeroContent from './HeroContent';

/**
 * Hero layer: wing-over-clouds background with the "Welcome to ChamMiles"
 * title block. Used as the deepest layer in the scroll-driven sequence;
 * stays visible behind the window mask until the final scene takes over.
 */
export default function FirstLayer() {
    const { gradientDelay, gradientDuration, smoothEase } = ANIMATION_CONFIG;
    const gradientEndDelay = gradientDelay + gradientDuration;
    const heroContainerVariants = getHeroContainerVariants(gradientEndDelay);
    const titleVariants = getTitleVariants(smoothEase);

    return (
        <section className="relative h-full w-full overflow-hidden">
            <BackgroundLayers
                gradientDelay={gradientDelay}
                gradientDuration={gradientDuration}
            />
            <HeroContent
                title={HERO_CONTENT.title}
                description={HERO_CONTENT.description}
                heroContainerVariants={heroContainerVariants}
                titleVariants={titleVariants}
            />
        </section>
    );
}
