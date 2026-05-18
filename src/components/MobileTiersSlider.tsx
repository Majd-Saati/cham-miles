import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";

import card from "@/assets/card.png";
import silverCard from "@/assets/benefits/silver-card.png";
import goldCard from "@/assets/benefits/gold-card.png";
import blackCard from "@/assets/benefits/black-card.png";

const TIERS = [
  {
    img: card,
    label: "Blue Tier",
    heading: "Free to join",
    desc: "Join Blue tier for free by registering through our website. This tier is a complementary tier and has no benefits or expiration date.",
    dot: "#006080",
  },
  {
    img: silverCard,
    label: "Silver Tier",
    heading: "25,000 Tier Miles",
    desc: "10kg extra baggage, priority baggage handling, and priority check-in.\n 50% off seat selection for added comfort before your flight.\n 25% bonus miles on every eligible flight.\n Lounge access with a guest, plus the option to redeem miles for free tickets or upgrades.",
    dot: "#9CA3AF",
  },
  {
    img: goldCard,
    label: "Gold Tier",
    heading: "50,000 Tier Miles",
    desc: "20kg extra baggage, priority baggage handling, and priority check-in.\n Free seat selection for a more comfortable journey.\n 50% bonus miles on every eligible flight.\n Lounge access with a guest, plus the option to redeem miles for free tickets or upgrades.",
    dot: "#C9B27A",
  },
  {
    img: blackCard,
    label: "Diamond Tier",
    heading: "75,000 Tier Miles",
    desc: "30kg extra baggage, priority baggage handling, and priority check-in.\n Complimentary seat selection for added comfort on every journey.\n 75% bonus miles on every eligible flight.\n Lounge access with a guest, plus the option to redeem miles for free tickets or upgrades.",
    dot: "#1F2937",
  },
];

type Props = {
  onJoin?: () => void;
};

const SWIPE_THRESHOLD = 30;
const SWIPE_VELOCITY = 250;

const DURATION = 1.6;
const EASE = [0.64, 0.01, 0.16, 1] as const;

// Active card width as a fraction of viewport container.
// Smaller value = more of the side cards is visible.
const SLIDE_PCT = 0.78;

const slideTransition = {
  duration: DURATION,
  ease: EASE,
};

function clampIndex(index: number) {
  return Math.max(0, Math.min(TIERS.length - 1, index));
}

export default function MobileTiersSlider({ onJoin }: Props) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => setViewportWidth(el.clientWidth);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const nextIndex = clampIndex(index);

      if (nextIndex === active) return;

      setDirection(nextIndex > active ? 1 : -1);
      setActive(nextIndex);
    },
    [active]
  );

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    if (offsetX < -SWIPE_THRESHOLD || velocityX < -SWIPE_VELOCITY) {
      goTo(active + 1);
    }

    if (offsetX > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY) {
      goTo(active - 1);
    }
  };

  const cardWidth = viewportWidth * SLIDE_PCT;
  const sidePad = (viewportWidth - cardWidth) / 2;
  const trackX = sidePad - active * cardWidth;
  const activeTier = TIERS[active];

  return (
    <div className="flex h-full w-full flex-col items-center px-4 pt-[6vh] pb-[4vh]">
      <h2
        className="m-0 text-center font-bold text-[#006080]"
        style={{ fontSize: "clamp(34px, 9vw, 44px)", lineHeight: 1.05 }}
      >
        Our Tiers
      </h2>

      <p
        className="mx-auto mt-2 max-w-[34ch] text-center text-[#01263B]"
        style={{ fontSize: "13px", lineHeight: 1.5 }}
      >
        Move through the ChamMiles tiers and discover benefits designed to make
        every journey more rewarding.
      </p>

      {/* Cards Slider */}
      <div
        ref={viewportRef}
        className="relative mt-5 w-full overflow-hidden touch-pan-y select-none"
      >
        <motion.div
          className="flex cursor-grab will-change-transform active:cursor-grabbing"
          animate={{
            x: trackX,
          }}
          transition={slideTransition}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
          onDragEnd={handleDragEnd}
        >
          {TIERS.map((tier, index) => {
            const distance = Math.abs(index - active);
            const isActive = distance === 0;
            const scale = isActive ? 1 : distance === 1 ? 0.82 : 0.74;
            const opacity = isActive ? 1 : distance === 1 ? 0.5 : 0.3;

            return (
              <div
                key={tier.label}
                className="shrink-0 px-0"
                style={{ width: cardWidth || `${SLIDE_PCT * 100}%` }}
              >
                <motion.div
                  className="overflow-hidden rounded-xl will-change-transform"
                  animate={{
                    opacity,
                    scale,
                    filter: isActive ? "blur(0px)" : "blur(0.5px)",
                  }}
                  transition={slideTransition}
                  style={{ transformOrigin: "50% 50%" }}
                >
                  <img
                    src={tier.img}
                    alt={tier.label}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    className="pointer-events-none block w-full select-none drop-shadow-xl"
                    style={{ WebkitUserDrag: "none" } as React.CSSProperties & { WebkitUserDrag: string }}
                  />
                </motion.div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Text Animation */}
      <div
        className="relative mt-3 w-full overflow-hidden"
        style={{ minHeight: "168px" }}
      >
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={activeTier.label}
            custom={direction}
            className="absolute inset-x-0 top-0 px-4 text-center"
            initial={{
              opacity: 0,
              y: direction > 0 ? 90 : -90,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: direction > 0 ? -90 : 90,
            }}
            transition={{
              duration: 0.6,
              ease: EASE,
            }}
          >
            <div
              className="font-normal text-[#01263B]/70"
              style={{ fontSize: "13px" }}
            >
              {activeTier.label}
            </div>

            <div
              className="mt-1 font-bold text-[#01263B]"
              style={{ fontSize: "19px" }}
            >
              {activeTier.heading}
            </div>

            <p
              className=" w-full mt-3 text-start text-[#01263B]/80 whitespace-pre-line"
              style={{ fontSize: "12.5px", lineHeight: 1.6 }}
            >
              {activeTier.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-3">
        {TIERS.map((tier, index) => {
          const isActive = index === active;

          return (
            <motion.button
              key={tier.label}
              type="button"
              aria-label={`Go to ${tier.label}`}
              onClick={() => goTo(index)}
              className="flex h-5 w-5 items-center justify-center rounded-full"
              animate={{
                scale: isActive ? 1.12 : 1,
              }}
              whileTap={{ scale: 0.9 }}
              transition={slideTransition}
              style={{
                boxShadow: isActive ? `0 0 0 2px ${tier.dot}` : "none",
              }}
            >
              <motion.span
                className="block rounded-full"
                animate={{
                  width: isActive ? 12 : 10,
                  height: isActive ? 12 : 10,
                  opacity: isActive ? 1 : 0.6,
                  backgroundColor: tier.dot,
                }}
                transition={slideTransition}
              />
            </motion.button>
          );
        })}
      </div>

      <motion.button
        type="button"
        onClick={onJoin}
        className="mx-auto mt-auto mb-2 w-full max-w-[320px] rounded-lg bg-[#006080] py-3 text-[15px] font-semibold text-[#FDFDFC]"
        whileHover={{ opacity: 0.9 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.2 }}
      >
        Become a Member
      </motion.button>
    </div>
  );
}