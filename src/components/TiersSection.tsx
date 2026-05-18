import tierBg from "@/assets/tier-bg.png";
import card from "@/assets/card.png";
import silverCard from "@/assets/benefits/silver-card.png";
import goldCard from "@/assets/benefits/gold-card.png";
import blackCard from "@/assets/benefits/black-card.png";
import c1 from "@/assets/benefits/c1.png";
import c2 from "@/assets/benefits/c2.png";
import c3 from "@/assets/benefits/c3.png";
import c4 from "@/assets/benefits/c4.png";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  animate,
} from "framer-motion";
import JoinForm from "./JoinForm";
import MobileTiersSlider from "./MobileTiersSlider";

const EASE: [number, number, number, number] = [0.64, 0.01, 0.16, 1];
const DURATION = 2.4;

const MARQUEE = ["Bonus Miles", "Special Prices", "Early News"];

const DETAILS_TABS = [
  {
    key: "blue",
    label: "Blue",
    color: "#006080",
    heading: "Free to join",
    bullets: [
      "Join Blue tier for free by registering through our website. This tier is a complementary tier and has no benefits or expiration date.",
    ],
  },
  {
    key: "silver",
    label: "Silver",
    color: "#9CA3AF",
    heading: "25,000 Tier Miles",
    bullets: [
      "10kg extra baggage, priority baggage handling, and priority check-in.",
      "50% off seat selection for added comfort before your flight.",
      "25% bonus miles on every eligible flight.",
      "Lounge access, plus the option to redeem miles for free tickets or upgrades.",
    ],
  },
  {
    key: "gold",
    label: "Gold",
    color: "#C9B27A",
    heading: "50,000 Tier Miles",
    bullets: [
      "20kg extra baggage, priority baggage handling, and priority check-in.",
      "Free seat selection for a more comfortable journey.",
      "50% bonus miles on every eligible flight.",
      "Lounge access with a guest, plus the option to redeem miles for free tickets or upgrades.",
    ],
  },
  {
    key: "diamond",
    label: "Diamond",
    color: "#1F2937",
    heading: "75,000 Tier Miles",
    bullets: [
      "30kg extra baggage, priority baggage handling, and priority check-in.",
      "Complimentary seat selection for added comfort on every journey.",
      "75% bonus miles on every eligible flight.",
      "Lounge access with a guest, plus the option to redeem miles for free tickets or upgrades.",
    ],
  },
];


// Helpers to interpolate between two CSS unit strings using a 0..1 mix.
const mixUnit = (from: string, to: string, m: number) => {
  const f = parseFloat(from);
  const t = parseFloat(to);
  const unit = from.replace(/[-0-9.]/g, "") || to.replace(/[-0-9.]/g, "") || "";
  return `${f + (t - f) * m}${unit}`;
};

const BENEFITS = [
  {
    title: "E-Store",
    desc: "Use your miles to explore exclusive rewards and travel related offers and travel-related benefits through our e-store.",
    img: c1,
    // Per-card animation window (progress 0..1 of the section scroll t)
    // start: when card begins fading in. end: when fully visible.
    start: 0.30,
    end: 0.45,
  },
  {
    title: "Free Seat Selection",
    desc: "Choose your preferred seat and enjoy a more comfortable journey, available for eligible ChamMiles tiers.",
    img: c2,
    start: 0.45,
    end: 0.60,
  },
  {
    title: "Business Lounge",
    desc: "Choose your preferred seat and enjoy a more comfortable journey, available for eligible ChamMiles tiers.",
    img: c3,
    start: 0.60,
    end: 0.75,
  },
  {
    title: "Free Ticket",
    desc: "Redeem your ChamMiles for free tickets and get closer to your next destination with every mile you earn.",
    img: c4,
    start: 0.75,
    end: 0.90,
  },
];

export default function TiersSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const goToTab = (next: number) => setActiveTab(next);
  // Live-tunable start/end values for the blue card's "final" animation.
  // start = pose at the beginning of the finalCard animation (phase4 = 0,
  // i.e. just after Phase 3 settles on CARD_FINAL).
  // end   = pose at the end of the finalCard animation (phase4 = 1,
  // i.e. the leftmost tier slot CARD_TIER_SLOT).
  // X is in vw, scale is a unit multiplier that drives image size.
  const [finalStartX, setFinalStartX] = useState(-50); // vw
  const [finalStartY, setFinalStartY] = useState(-18); // vh
  const [finalEndX, setFinalEndX] = useState(-57);   // vw
  const [finalStartScale, setFinalStartScale] = useState(0.22);
  const [finalEndScale, setFinalEndScale] = useState(0.35);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Threshold-triggered one-shot eased animations. Each phase plays forward
  // when scroll passes its enter threshold and reverses back to 0 when
  // scroll moves back above it. Thresholds are spaced so phases never run
  // simultaneously, and scrolling up cleanly reverses each one in order.
  const t = useMotionValue(0);
  const exit = useMotionValue(0);
  const phase4 = useMotionValue(0);
  const tStateRef = useRef<0 | 1>(0);
  const exitStateRef = useRef<0 | 1>(0);
  const phase4StateRef = useRef<0 | 1>(0);
  const phase5 = useMotionValue(0);
  const phase5StateRef = useRef<0 | 1>(0);

  // Block additional scroll input while a phase animation is playing so the
  // user can't skip past it with a single fast wheel/touch fling.
  const lockScroll = () => {
    if (typeof window === "undefined") return;
    (window as any).__scrollLockUntil =
      performance.now() + DURATION * 1000;
  };

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const nextT: 0 | 1 = v > 0.08 ? 1 : 0;
    if (nextT !== tStateRef.current) {
      tStateRef.current = nextT;
      animate(t, nextT, { duration: DURATION, ease: EASE });
      lockScroll();
    }
    const nextExit: 0 | 1 = v > 0.40 ? 1 : 0;
    if (nextExit !== exitStateRef.current) {
      exitStateRef.current = nextExit;
      animate(exit, nextExit, { duration: DURATION, ease: EASE });
      lockScroll();
    }
    const nextPhase4: 0 | 1 = v > 0.72 ? 1 : 0;
    if (nextPhase4 !== phase4StateRef.current) {
      phase4StateRef.current = nextPhase4;
      animate(phase4, nextPhase4, { duration: DURATION, ease: EASE });
      lockScroll();
    }
    const nextPhase5: 0 | 1 = v > 0.86 ? 1 : 0;
    if (nextPhase5 !== phase5StateRef.current) {
      phase5StateRef.current = nextPhase5;
      animate(phase5, nextPhase5, { duration: DURATION, ease: EASE });
      lockScroll();
    }
    // Auto-close the tiers details/carousel view whenever scroll leaves
    // the "Our Tiers" phase, so its content never overlaps other steps.
    if (v < 0.70 || v > 0.95) {
      setDetailsOpen((open) => (open ? false : open));
    }
  });

  // Text: slides left + fades
  const textX = useTransform(t, [0, 1], ["0vw", "-80vw"]);
  const textOpacity = useTransform(t, [0, 0.6], [1, 0]);

  // Card: bottom-right -> left/center, keep similar size, rotated back
  // Desktop base position is bottom-right of the hero, so t=0 stays in place
  // and t=1 translates it up-left next to the benefits panel.
  // Mobile base position is top-left (where it lands during the Benefits
  // step), so t=0 has to OFFSET the card down-right (so it appears at the
  // bottom-right during the Tiers step) and t=1 brings it back to base.
  const cardXDesktop = useTransform(t, [0, 1], ["0vw", "-65vw"]);
  const cardYDesktop = useTransform(t, [0, 1], ["0vh", "-25vh"]);
  const cardScaleDesktop = useTransform(t, [0, 1], [1, 0.7]);
  const cardRotateDesktop = useTransform(t, [0, 1], [10, -8]);
  const cardXMobile = useTransform(t, [0, 1], ["45vw", "0vw"]);
  const cardYMobile = useTransform(t, [0, 1], ["70vh", "0vh"]);
  const cardScaleMobile = useTransform(t, [0, 1], [1.55, 1]);
  const cardRotateMobile = useTransform(t, [0, 1], [10, -8]);
  const cardX = useTransform(
    [cardXDesktop, cardXMobile] as any,
    ([d, m]: [string, string]) => (isMobile ? m : d),
  );
  const cardY = useTransform(
    [cardYDesktop, cardYMobile] as any,
    ([d, m]: [string, string]) => (isMobile ? m : d),
  );
  const cardScale = useTransform(
    [cardScaleDesktop, cardScaleMobile] as any,
    ([d, m]: [number, number]) => (isMobile ? m : d),
  );
  const cardRotate = useTransform(
    [cardRotateDesktop, cardRotateMobile] as any,
    ([d, m]: [number, number]) => (isMobile ? m : d),
  );

  // Benefits panel slides in from the right as one unit
  const benefitsX = useTransform(t, [0, 1], ["55vw", "0vw"]);
  const benefitsOpacity = useTransform(t, [0.25, 0.7], [0, 1]);

  // Phase 2: triggered as a one-shot eased animation past a scroll threshold.
  const benefitsExitY = useTransform(exit, [0, 1], ["0vh", "-60vh"]);
  const benefitsExitOpacity = useTransform(exit, [0, 1], [1, 0]);
  const benefitsCombinedOpacity = useTransform(
    [benefitsOpacity, benefitsExitOpacity] as any,
    ([a, b]: number[]) => a * b,
  );

  // Phase 3 — card transitions from its "tiers" pose to a center-upright pose,
  // and the JoinEarly content fades up into view, all driven by `exit`.
  const CARD_TIERS = { x: "-65vw", y: "-25vh", scale: 0.7, rotate: -8 };
  // On mobile the base position is top-left (left:-10vw, top:-15vh, w:50vw),
  // so to center the card in the Join step we translate it down-right and
  // scale it up to a comfortable hero size — matching the reference video.
  const CARD_FINAL = isMobile
    ? { x: "35vw", y: "50vh", scale: 0.60, rotate: 0 }
    : { x: `${finalStartX}vw`, y: `${finalStartY}vh`, scale: finalStartScale, rotate: 0 };
  // Phase 4 — blue card slides into the leftmost tier slot
  const CARD_TIER_SLOT = { x: `${finalEndX}vw`, y: "-5vh", scale: finalEndScale, rotate: 0 };
  const phase3CardX = useTransform(
    [cardX, exit] as any,
    ([cx, e]: [string, number]) => mixUnit(cx, CARD_FINAL.x, e),
  );
  const phase3CardY = useTransform(
    [cardY, exit] as any,
    ([cy, e]: [string, number]) => mixUnit(cy, CARD_FINAL.y, e),
  );
  const phase3CardScale = useTransform(
    [cardScale, exit] as any,
    ([cs, e]: [number, number]) => cs + (CARD_FINAL.scale - cs) * e,
  );
  const phase3CardRotate = useTransform(
    [cardRotate, exit] as any,
    ([cr, e]: [number, number]) => cr + (CARD_FINAL.rotate - cr) * e,
  );
  const finalCardX = useTransform(
    [phase3CardX, phase4] as any,
    ([cx, p]: [string, number]) => mixUnit(cx, CARD_TIER_SLOT.x, p),
  );
  const finalCardY = useTransform(
    [phase3CardY, phase4] as any,
    ([cy, p]: [string, number]) => mixUnit(cy, CARD_TIER_SLOT.y, p),
  );
  const finalCardScale = useTransform(
    [phase3CardScale, phase4] as any,
    ([cs, p]: [number, number]) => cs + (CARD_TIER_SLOT.scale - cs) * p,
  );
  const finalCardRotate = useTransform(
    [phase3CardRotate, phase4] as any,
    ([cr, p]: [number, number]) => cr + (CARD_TIER_SLOT.rotate - cr) * p,
  );

  // JoinEarly headline / subtext: fade in from left -> right
  const joinX = useTransform(exit, [0, 1], ["-30vw", "0vw"]);
  const joinOpacityIn = useTransform(exit, [0.25, 1], [0, 1]);
  const joinOutY = useTransform(phase4, [0, 1], ["0vh", "-40vh"]);
  const joinOpacity = useTransform(
    [joinOpacityIn, phase4] as any,
    ([o, p]: number[]) => o * (1 - p),
  );
  // Marquee: fade in from bottom -> top
  const marqueeY = useTransform(exit, [0, 1], ["20vh", "0vh"]);
  const marqueeOpacityIn = useTransform(exit, [0.5, 1], [0, 1]);
  const marqueeOutY = useTransform(phase4, [0, 1], ["0vh", "-30vh"]);
  const marqueeY2 = useTransform(
    [marqueeY, marqueeOutY] as any,
    ([a, b]: string[]) => `${parseFloat(a) + parseFloat(b)}vh`,
  );
  const marqueeOpacity = useTransform(
    [marqueeOpacityIn, phase4] as any,
    ([o, p]: number[]) => o * (1 - p),
  );
  // Phase 4 reveals
  const tiersTitleOpacity = useTransform(phase4, [0.2, 1], [0, 1]);
  const tiersTitleY = useTransform(phase4, [0, 1], ["-10vh", "0vh"]);
  const tierRowOpacity = useTransform(phase4, [0.3, 1], [0, 1]);
  const tierRowY = useTransform(phase4, [0, 1], ["20vh", "0vh"]);
  // suppress unused-var warnings for tier pose constants
  void CARD_TIERS;

  // Per-card opacity (driven by each card's own start/end window).
  // Hooks must be called unconditionally — declare one per card explicitly.
  const card0Opacity = useTransform(t, [BENEFITS[0].start, BENEFITS[0].end], [0, 1]);
  const card1Opacity = useTransform(t, [BENEFITS[1].start, BENEFITS[1].end], [0, 1]);
  const card2Opacity = useTransform(t, [BENEFITS[2].start, BENEFITS[2].end], [0, 1]);
  const card3Opacity = useTransform(t, [BENEFITS[3].start, BENEFITS[3].end], [0, 1]);
  const cardOpacities = [card0Opacity, card1Opacity, card2Opacity, card3Opacity];

  // Phase 5 — Tiers slides up & fades out, Join form slides up from below
  const tiersExitY = useTransform(phase5, [0, 1], ["0vh", "-65vh"]);
  const tiersExitOpacity = useTransform(phase5, [0, 0.7], [1, 0]);
  // Subtle parallax: card row leaves slightly faster than the title
  const tiersRowExitY = useTransform(phase5, [0, 1], ["0vh", "-80vh"]);

  // Incoming join form — title with light parallax (slower), card faster
  const joinFormTitleY = useTransform(phase5, [0, 1], ["80vh", "0vh"]);
  const joinFormCardY = useTransform(phase5, [0, 1], ["100vh", "0vh"]);
  const joinFormOpacity = useTransform(phase5, [0.15, 1], [0, 1]);
  const joinFormVisibility = useTransform(phase5, (v) =>
    v > 0.02 ? "visible" : "hidden",
  );
  const joinFormPointer = useTransform(phase5, (v) =>
    v > 0.5 ? "auto" : "none",
  );

  // Fade-out factor for tiers content during phase 5 (1 → 0)
  const tiersFadeOut = useTransform(phase5, [0, 0.7], [1, 0]);
  // Combined opacity for the floating blue card during phase 5
  const blueCardPhase5Opacity = useTransform(phase5, [0, 0.7], [1, 0]);
  // On mobile, hide the floating blue card once the tiers slider takes over.
  const blueCardMobileHide = useTransform(phase4, [0, 0.15], [1, 0]);
  const blueCardOpacityMobile = useTransform(
    [blueCardPhase5Opacity, blueCardMobileHide] as any,
    ([a, b]: number[]) => a * b,
  );

  // Mobile-only Our Tiers slider — fades in with phase4, out with phase5
  const mobileTiersOpacity = useTransform(
    [phase4, phase5] as any,
    ([p4, p5]: number[]) => p4 * (1 - p5),
  );
  const mobileTiersVisibility = useTransform(
    [phase4, phase5] as any,
    ([p4, p5]: number[]) => (p4 > 0.05 && p5 < 0.95 ? "visible" : "hidden"),
  );
  const mobileTiersPointer = useTransform(
    [phase4, phase5] as any,
    ([p4, p5]: number[]) => (p4 > 0.5 && p5 < 0.2 ? "auto" : "none"),
  );
  // Blue floating card slides up together with the other tier cards in phase 5
  const blueCardExitYDesktop = useTransform(
    [finalCardY, tiersRowExitY] as any,
    ([a, b]: string[]) => `${parseFloat(a) + parseFloat(b)}vh`,
  );
  const blueCardExitYMobile = useTransform(
    [finalCardY, tiersRowExitY] as any,
    ([a, b]: string[]) => `${parseFloat(a) + parseFloat(b) + 12}vh`,
  );
  // Only allow interaction with the blue floating card once it has reached
  // its "Our Tiers" slot (phase 4) and before the join form takes over.
  const blueCardPointer = useTransform(
    [phase4, phase5] as any,
    ([p4, p5]: number[]) => (p4 > 0.6 && p5 < 0.2 ? "auto" : "none"),
  );
  // Combined opacity for the "Our Tiers" title (phase4 fade-in × phase5 fade-out)
  const tiersTitleCombinedOpacity = useTransform(
    [tiersTitleOpacity, tiersFadeOut] as any,
    ([a, b]: number[]) => a * b,
  );

  // Combined opacity for the subtitle / tier row / CTA so they only appear
  // in phase 4 and fade out during phase 5 (and stay hidden earlier).
  const tiersSubtitleCombinedOpacity = useTransform(
    [tiersTitleOpacity, tiersFadeOut] as any,
    ([a, b]: number[]) => a * b,
  );
  const tierRowCombinedOpacity = useTransform(
    [tierRowOpacity, tiersFadeOut] as any,
    ([a, b]: number[]) => a * b,
  );
  // Combined Y for the row: phase4 entrance + phase5 exit
  const tierRowCombinedY = useTransform(
    [tierRowY, tiersRowExitY] as any,
    ([a, b]: string[]) => `${parseFloat(a) + parseFloat(b)}vh`,
  );

  // Stop any in-flight animations on unmount
  useEffect(() => () => { t.stop(); exit.stop(); phase4.stop(); phase5.stop(); }, [t, exit, phase4, phase5]);

  const [cardHovered, setCardHovered] = useState(false);
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);
  const scrollToJoinForm = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const containerTop = window.scrollY + rect.top;
    const targetProgress = 0.95; // lands past phase5 threshold (0.86)
    const y = containerTop + targetProgress * (el.offsetHeight - window.innerHeight);
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <>
    {/* Dev-only live controls for the blue card's final animation
        (X position + image size at start and end). */}

    <div ref={containerRef} className="relative" style={{ height: "620vh" }}>
      <section
        className="sticky top-0 flex h-screen w-full overflow-hidden bg-[#FDFDFC]"
        style={{
          fontFamily: "'Montserrat', system-ui, sans-serif",
          backgroundImage: `url(${tierBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <motion.div
          style={{ x: textX, opacity: textOpacity }}
          className="relative z-10 flex flex-1 flex-col items-start gap-5 px-[7vw] pt-[10vh] md:justify-center md:pt-0 md:gap-8 md:px-[6vw] will-change-transform"
        >
          <h2
            className="m-0 font-semibold text-[#006080] max-w-[9ch] md:max-w-none"
            style={{ fontSize: "clamp(48px, 4.5vw, 64px)", lineHeight: 1.05 }}
          >
            Tiers and Benefits
          </h2>
          <p
            className="m-0 max-w-xl text-[#01263B]"
            style={{ fontSize: "clamp(14px, 1.1vw, 18px)", lineHeight: 1.5 }}
          >
            Every journey with ChamMiles brings you closer to more rewards,
            comfort, and exclusive travel privileges.
          </p>
          <button
            type="button"
            onClick={scrollToJoinForm}
            className="rounded-lg bg-[#006080] px-10 py-2.5 text-base font-semibold text-[#FDFDFC] transition-opacity hover:opacity-90"
          >
            Join now
          </button>
        </motion.div>

                <motion.div
          className={`absolute select-none overflow-hidden  drop-shadow-2xl will-change-transform z-50 w-[50vw] left-[-10vw] top-[-15vh] md:left-auto md:top-auto md:w-[40vw] md:right-[-4vh] md:bottom-[-2vh] ${
            detailsOpen ? "pointer-events-none" : "cursor-pointer"
          }`}
          style={{
            x: finalCardX,
            y: isMobile ? blueCardExitYMobile : blueCardExitYDesktop,
            scale: finalCardScale,
            rotate: finalCardRotate,
            transformOrigin: "center center",
            opacity: isMobile ? blueCardOpacityMobile : blueCardPhase5Opacity,
            pointerEvents: detailsOpen ? "none" : (blueCardPointer as any),
            visibility: detailsOpen ? "hidden" : "visible",
          }}
          animate={detailsOpen ? { opacity: 0 } : {}}
          transition={{ duration: 0 }}
          onMouseEnter={() => setCardHovered(true)}
          onMouseLeave={() => setCardHovered(false)}
          onClick={() => {
            if (!detailsOpen) {
              setActiveTab(0);
              setDetailsOpen(true);
            }
          }}
        >
          <img
            src={card}
            alt="ChamMiles Blue Tier card"
            draggable={false}
            className="block w-full select-none"
          />

  <motion.div
    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black"
    initial={false}
    animate={{
      opacity: cardHovered ? 0.4 : 0,
    }}
    transition={{
      duration: 0.25,
      ease: "easeOut",
    }}
  />

  <motion.div
    className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    initial={false}
    animate={{
      opacity: cardHovered ? 1 : 0,
    }}
    transition={{
      duration: 0.25,
      ease: "easeOut",
    }}
  >
    <span
      className="font-semibold text-white"
      style={{ fontSize: "clamp(20px, 2.4vw, 40px)" }}
    >
      View details
    </span>
  </motion.div>
</motion.div>

        <motion.div
          style={{
            opacity: benefitsCombinedOpacity,
            x: benefitsX,
            y: benefitsExitY,
          }}
          className="absolute right-0 top-8 z-20 flex h-screen w-full flex-col justify-center gap-3 overflow-y-auto px-[6vw] py-[14vh] will-change-transform md:w-[50vw] md:gap-5 md:overflow-visible md:py-0 md:pl-[2vw] md:pr-[3vw]"
        >
          <h3
            className="m-0 font-semibold text-[#006080]"
            style={{ fontSize: "clamp(22px, 2.2vw, 34px)", lineHeight: 1.15 }}
          >
            Benefits that matter to you
          </h3>
          <p
            className="m-0 max-w-lg text-[#01263B]"
            style={{ fontSize: "clamp(12px, 1vw, 16px)", lineHeight: 1.5 }}
          >
            ChamMiles brings you closer to exclusive rewards, travel comfort,
            and privileges made for frequent flyers.
          </p>

          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 md:gap-3">
            {BENEFITS.map((b, i) => (
              <motion.li
                key={b.title}
                style={{ opacity: cardOpacities[i] }}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F5F4] p-3 shadow-sm will-change-[opacity] md:items-start md:gap-4 md:p-5"
              >
                <div className="min-w-0 flex-1">
                  <h4
                    className="m-0 mb-1 font-semibold text-[#006080]"
                    style={{ fontSize: "clamp(14px, 1.15vw, 18px)" }}
                  >
                    {b.title}
                  </h4>
                  <p
                    className="m-0 text-[#01263B]"
                    style={{ fontSize: "clamp(11px, 0.85vw, 14px)", lineHeight: 1.45 }}
                  >
                    {b.desc}
                  </p>
                </div>
                <img
                  src={b.img}
                  alt={b.title}
                  draggable={false}
                  className="h-14 w-20 shrink-0 rounded-md object-cover shadow-md md:h-[88px] md:w-[120px]"
                />
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Phase 3 — JoinEarly content rendered inside the same sticky scene */}
        <motion.div
          style={{ x: joinX, y: joinOutY, opacity: joinOpacity }}
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-full flex-col justify-start pt-[12vh] md:w-[55vw] md:justify-center md:pt-0 px-4 md:px-[6vw] will-change-transform"
        >
          {/* Mobile heading: "Join Early Earn" wraps, then "More" */}
          <h2
            className="m-0 font-bold leading-[1.05] text-[#006080] md:hidden"
            style={{ fontSize: "clamp(48px, 13vw, 64px)" }}
          >
            Join Early <span className="text-[#C9B27A]">Earn</span> More
          </h2>
          {/* Desktop heading: three stacked lines */}
          <h2
            className="m-0 hidden font-bold leading-[1.05] text-[#006080] md:block"
            style={{ fontSize: "clamp(40px, 6vw, 88px)" }}
          >
            Join Early
          </h2>
          <h2
            className="m-0 hidden font-bold leading-[1.05] text-[#C9B27A] md:block"
            style={{ fontSize: "clamp(40px, 6vw, 88px)" }}
          >
            Earn
          </h2>
          <h2
            className="m-0 hidden font-bold leading-[1.05] text-[#006080] md:block"
            style={{ fontSize: "clamp(40px, 6vw, 88px)" }}
          >
            More
          </h2>
          <p
            className="m-0 mt-4 max-w-none text-[#01263B] md:max-w-md"
            style={{ fontSize: "clamp(15px, 1.2vw, 16px)", lineHeight: 1.5 }}
          >
            Be among the first ChamMiles members and enjoy early rewards,
            exclusive updates, and special chances to win.
          </p>
        </motion.div>

        <motion.div
          style={{ opacity: marqueeOpacity, y: marqueeY2 }}
          className="pointer-events-none absolute bottom-12 left-0 z-10 w-full overflow-hidden"
        >
          <div className="flex w-max gap-16 whitespace-nowrap pl-8 [animation:marquee_25s_linear_infinite]">
            {Array.from({ length: 6 }).flatMap((_, i) =>
              MARQUEE.map((label) => (
                <span
                  key={`${i}-${label}`}
                  className="font-semibold text-[#006080]"
                  style={{ fontSize: "clamp(14px, 1.3vw, 20px)" }}
                >
                  {label}
                </span>
              )),
            )}
          </div>
        </motion.div>
        <style>{`@keyframes marquee { from { transform: translateX(0);} to { transform: translateX(-50%);} }`}</style>

        {/* Phase 4 — Our Tiers */}
        <motion.h2
          style={{
            opacity: detailsOpen ? 1 : (tiersTitleCombinedOpacity as any),
            y: detailsOpen ? 0 : (tiersExitY as any),
            x: "-50%",
          }}
          className="pointer-events-none absolute top-[12vh] z-10 m-0 hidden md:inline-block whitespace-nowrap font-bold tracking-tight text-[#006080]"
          animate={
            detailsOpen
              ? { left: "6vw", x: "0%" }
              : { left: "50%", x: "-50%" }
          }
          transition={{ duration: DURATION, ease: EASE }}
        >
          <span style={{ fontSize: "clamp(40px, 5.5vw, 80px)", lineHeight: 1 }}>
            Our Tiers
          </span>
        </motion.h2>

        <motion.p
          style={{ opacity: tiersSubtitleCombinedOpacity, y: tiersExitY, visibility: detailsOpen ? "hidden" : "visible" }}
          className="pointer-events-none absolute left-0 right-0 top-[26vh] z-10 m-0 mx-auto hidden md:block max-w-xl px-6 text-center text-[#01263B]"
          animate={detailsOpen ? { opacity: 0 } : {}}
          transition={{ duration: DURATION, ease: EASE }}
        >
          <span style={{ fontSize: "clamp(13px, 1vw, 16px)", lineHeight: 1.5 }}>
            Move through the ChamMiles tiers and discover benefits designed to
            make every journey more rewarding.
          </span>
        </motion.p>

        <motion.div
          style={{ opacity: tierRowCombinedOpacity, y: tierRowCombinedY }}
          className="absolute inset-x-0 bottom-[14vh] z-10 hidden md:flex items-end justify-center gap-[3vw] px-[6vw] will-change-transform"
        >
          {[
            { img: null, title: "Blue Tire", sub: "Free to join", clickable: true },
            { img: silverCard, title: "Silver Tire", sub: "25,000 Tier Miles", clickable: true },
            { img: goldCard, title: "Gold Tire", sub: "50,000 Tier Miles", clickable: true },
            { img: blackCard, title: "Diamond Tier", sub: "75,000 Tier Miles", clickable: true },
          ].map((tier, i) => {
            // Row cards instantly disappear once details opens — the
            // carousel cards take over and visually animate FROM these
            // same row positions into their carousel slots, so it reads
            // as the row cards themselves moving into place.
            const animateTarget = detailsOpen
              ? { opacity: 0 }
              : { x: 0, y: 0, scale: 1, opacity: 1 };
            return (
            <motion.div
              key={tier.title}
              animate={animateTarget}
              transition={{ duration: detailsOpen ? 0 : DURATION, ease: EASE }}
              className={`group relative flex w-[14vw] flex-col items-center ${tier.clickable && !detailsOpen ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
              onMouseEnter={() => i !== 0 && setHoveredTier(i)}
              onMouseLeave={() => setHoveredTier((h) => (h === i ? null : h))}
              onClick={() => {
                if (tier.clickable && !detailsOpen) {
                  setActiveTab(i);
                  setDetailsOpen(true);
                }
              }}
            >
              {tier.img ? (
                <div className="relative w-full overflow-hidden rounded-[1vw]">
                  <img
                    src={tier.img}
                    alt={tier.title}
                    draggable={false}
                    className="block w-full select-none drop-shadow-xl"
                  />
                  <motion.div
                    className="pointer-events-none absolute inset-0 z-10 bg-black"
                    initial={false}
                    animate={{ opacity: hoveredTier === i ? 0.4 : 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                  <motion.div
                    className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                    initial={false}
                    animate={{ opacity: hoveredTier === i ? 1 : 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <span
                      className="font-semibold text-white"
                      style={{ fontSize: "clamp(12px, 1vw, 18px)" }}
                    >
                      View details
                    </span>
                  </motion.div>
                </div>
              ) : (
                <div className="relative w-full" style={{ aspectRatio: "1.6 / 1" }}>
                </div>
              )}
              <motion.div
                className="mt-3 text-center"
                animate={detailsOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: DURATION, ease: EASE }}
              >
                <div
                  className="font-semibold text-[#01263B]"
                  style={{ fontSize: "clamp(13px, 1vw, 16px)" }}
                >
                  {tier.title}
                </div>
                <div
                  className="text-[#01263B]"
                  style={{ fontSize: "clamp(12px, 0.9vw, 15px)" }}
                >
                  {tier.sub}
                </div>
              </motion.div>
            </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          style={{ opacity: tierRowCombinedOpacity, y: tierRowCombinedY }}
          className="pointer-events-none absolute inset-x-0 bottom-[4vh] z-10 hidden md:flex justify-center"
          animate={detailsOpen ? { opacity: 0, y: -30 } : {}}
          transition={{ duration: DURATION, ease: EASE }}
        >
          <button
            type="button"
            onClick={scrollToJoinForm}
            className="pointer-events-auto rounded-lg bg-[#006080] px-8 py-3 text-sm font-semibold text-[#FDFDFC] transition-opacity hover:opacity-90"
            style={{ visibility: detailsOpen ? "hidden" : "visible" }}
          >
            Become a Member
          </button>
        </motion.div>

        {/* Details view — appears when active (Blue) card is clicked */}
        {detailsOpen && (
          <motion.div
            className="absolute inset-0 z-30 hidden md:block will-change-transform"
            style={{ opacity: tiersFadeOut, y: tiersExitY }}
          >
            {/* Right-side tier carousel: top = next, center = active, bottom = previous.
                When activeTab changes, each card smoothly animates between roles. */}
            {(() => {
              const CARDS = [card, silverCard, goldCard, blackCard];
              const total = CARDS.length;
              // Bounded vertical stack on the right side — no wrap-around.
              //  offset +1: NEXT card (top preview, small, slightly right).
              //  offset  0: ACTIVE card (center, large).
              //  offset -1: PREVIOUS card (bottom preview, small, slightly right).
              //  |offset| >= 2: hidden off-screen on the corresponding side.
              // Cards arc diagonally between slots for the "circular floating"
              // feel — side slots sit further to the right than the active.
              const slotFor = (offset: number) => {
                if (offset === 0)
                  return { x: "0vw",  y: "0vh",   scale: 1,    opacity: 1, zIndex: 30 };
                if (offset === 1)
                  return { x: "8vw",  y: "-34vh", scale: 0.32, opacity: 1, zIndex: 20 };
                if (offset === -1)
                  return { x: "8vw",  y: "34vh",  scale: 0.32, opacity: 1, zIndex: 20 };
                if (offset >= 2)
                  return { x: "60vw", y: "-34vh", scale: 0.32, opacity: 0, zIndex: 10 };
                return     { x: "60vw", y: "34vh",  scale: 0.32, opacity: 0, zIndex: 10 };
              };
              // Per-card initial position matching the row card's resting
              // spot in the tier row above (bottom-[14vh], 4 cards w-14vw,
              // gap-3vw, justify-center). Computed for ~16:9 viewport but
              // expressed in vw/vh so it scales reasonably.
              const ROW_INITIAL: Record<number, { x: string; y: string; scale: number }> = {
                0: { x: "-54vw", y: "29vh", scale: 0.47 },
                1: { x: "-37vw", y: "29vh", scale: 0.47 },
                2: { x: "-20vw", y: "29vh", scale: 0.47 },
                3: { x: "-3vw",  y: "29vh", scale: 0.47 },
              };
              return (
                <div className="absolute right-[6vw] top-1/2 h-0 w-[30vw] -translate-y-1/2">
                  {CARDS.map((src, i) => {
                    // Signed offset from active (no wrap). Order is
                    // Blue(0) → Silver(1) → Gold(2) → Diamond(3).
                    // Positive = comes AFTER active (shown on top as "next").
                    // Negative = comes BEFORE active (shown on bottom as "prev").
                    const offset = i - activeTab;
                    const raw = (i - activeTab + total) % total;
                    const target = slotFor(offset);
                    const isActive = raw === 0;
                    const isHidden = target.opacity === 0;
                    const start = ROW_INITIAL[i] ?? { x: "0vw", y: "60vh", scale: 0.4 };
                    return (
                      <motion.img
                        key={`carousel-${i}`}
                        src={src}
                        alt=""
                        draggable={false}
                        initial={{ x: start.x, y: start.y, scale: start.scale, opacity: 1 }}
                        animate={{
                          x: target.x,
                          y: target.y,
                          scale: target.scale,
                          opacity: target.opacity,
                          zIndex: target.zIndex,
                        }}
                        transition={{ duration: DURATION, ease: EASE }}
                        onClick={() => !isActive && goToTab(i)}
                        style={{
                          transformOrigin: "center center",
                          pointerEvents: isHidden ? "none" : "auto",
                          cursor: isActive ? "default" : "pointer",
                        }}
                        className="absolute right-0 top-0 w-full -translate-y-1/2 select-none rounded-lg drop-shadow-2xl"
                      />
                    );
                  })}
                </div>
              );
            })()}

            {/* Tabs + content + button fade in from top */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION, ease: EASE, delay: 0.25 }}
              className="absolute left-[6vw] right-[6vw] top-[30vh] flex w-auto flex-col gap-5 md:left-[6vw] md:right-auto md:top-[34vh] md:w-[40vw]"
            >
              <div className="w-full max-w-lg flex flex-col items-start gap-3 border-b border-[#006080]/50 md:flex-row md:items-center md:gap-14">
                {DETAILS_TABS.map((tab, i) => {
                  const isActive = i === activeTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => goToTab(i)}
                      className={`pointer-events-auto relative flex items-center gap-3 pb-4 transition-colors text-[#3E3E3B]`}
                    >
                      <span
                        className="inline-block h-[18px] w-[18px] rounded-full"
                        style={{
                          background: tab.color,
                        }}
                      />
                      <span className={`text-[18px] `}>
                        {tab.label}
                      </span>
                      {isActive && (
                        <motion.span
                          layoutId="tier-tab-underline"
                          className="absolute -bottom-[2px] left-0 right-0 h-[2px] rounded-full bg-[#006080]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <motion.h3
                key={`h-${activeTab}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="m-0 font-semibold tracking-tight text-[#01263B]"
                style={{ fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 1.2 }}
              >
                {DETAILS_TABS[activeTab].heading}
              </motion.h3>
              <motion.ul
                key={`l-${activeTab}`}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
                }}
                className="m-0 flex w-full max-w-md list-none flex-col gap-2 break-words p-0 text-[#01263B]/65"
                style={{ fontSize: "clamp(12px, 0.85vw, 14px)", lineHeight: 1.6 }}
              >
                {DETAILS_TABS[activeTab].bullets.map((b, idx) => (
                  <motion.li
                    key={idx}
                    variants={{
                      hidden: { opacity: 0, y: 18 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                    }}
                  >
                    {b}
                  </motion.li>
                ))}
              </motion.ul>
              <button
                type="button"
                onClick={() => {
                  scrollToJoinForm();
                }}
                className="pointer-events-auto mt-6 w-fit rounded-[8px] bg-[#006080] px-10 py-3.5 text-[15px] font-semibold text-[#FDFDFC] transition-opacity hover:opacity-90"
              >
                Join now
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Mobile-only "Our Tiers" slider (phase 4) */}
        <motion.div
          style={{
            opacity: mobileTiersOpacity,
            visibility: mobileTiersVisibility as any,
            pointerEvents: mobileTiersPointer as any,
          }}
          className="absolute inset-0 z-30 md:hidden flex flex-col bg-[#FDFDFC]/0 will-change-transform"
        >
          <MobileTiersSlider onJoin={scrollToJoinForm} />
        </motion.div>

        {/* Phase 5 — Join form section slides up from below */}
        <motion.div
          style={{
            opacity: joinFormOpacity,
            visibility: joinFormVisibility as any,
            pointerEvents: joinFormPointer as any,
          }}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6 will-change-transform"
        >
          <motion.div
            style={{ y: joinFormTitleY }}
            className="mb-6 max-w-xl text-center will-change-transform"
          >
            <h2
              className="m-0 font-bold leading-[1.05]"
              style={{ fontSize: "clamp(28px, 3vw, 44px)" }}
            >
              <span className="text-[#006080]">Join </span>
              <span className="text-[#C9B27A]">Cham Miles</span>
              <span className="text-[#006080]"> Today</span>
            </h2>
            <p
              className="mx-auto mt-3 max-w-sm text-[#01263B]"
              style={{ fontSize: "12px", lineHeight: 1.5 }}
            >
              Create your free ChamMiles account and start earning miles,
              unlocking rewards, and enjoying exclusive travel benefits with
              every journey.
            </p>
          </motion.div>
          <motion.div
            style={{ y: joinFormCardY }}
            className=" will-change-transform"
          >
            <JoinForm />
          </motion.div>
        </motion.div>
      </section>
    </div>
    </>
  );
}

type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
};

function SliderRow({ label, value, min, max, step, onChange, format }: SliderRowProps) {
  return (
    <div className="mt-2 first:mt-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-emerald-300">{label}</span>
        <span className="tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-400"
      />
    </div>
  );
}
