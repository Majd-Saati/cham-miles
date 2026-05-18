import tierBg from "@/assets/tier-bg.png";
import card from "@/assets/card.png";
import silverCard from "@/assets/benefits/silver-card.png";
import goldCard from "@/assets/benefits/gold-card.png";
import blackCard from "@/assets/benefits/black-card.png";
import c1 from "@/assets/benefits/c1.png";
import c2 from "@/assets/benefits/c2.png";
import c3 from "@/assets/benefits/c3.png";
import c4 from "@/assets/benefits/c4.png";
import { useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  animate,
} from "framer-motion";

const EASE: [number, number, number, number] = [0.64, 0.01, 0.16, 1];
const DURATION = 2.4;

const MARQUEE = ["Bonus Miles", "Special Prices", "Early News"];

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
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Eased one-shot progress (0 -> 1) driven by scroll direction past threshold
  const t = useMotionValue(0);
  const stateRef = useRef<0 | 1>(0);
  const exit = useMotionValue(0);
  const exitStateRef = useRef<0 | 1>(0);
  const entranceDoneRef = useRef(false);
  const entranceScrollRef = useRef(0);
  // Phase 4 — "Our Tiers" reveal
  const phase4 = useMotionValue(0);
  const phase4StateRef = useRef<0 | 1>(0);
  const exitDoneRef = useRef(false);
  const exitScrollRef = useRef(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next: 0 | 1 = v > 0.05 ? 1 : 0;
    if (next !== stateRef.current) {
      stateRef.current = next;
      animate(t, next, { duration: DURATION, ease: EASE });
    }
    // Phase 3 trigger — past ~1/3 of the section
    const nextExit: 0 | 1 = v > 0.38 ? 1 : 0;
    if (nextExit !== exitStateRef.current) {
      exitStateRef.current = nextExit;
      animate(exit, nextExit, { duration: DURATION, ease: EASE });
    }
    // Phase 4 trigger — past ~2/3 of the section
    const nextPhase4: 0 | 1 = v > 0.7 ? 1 : 0;
    if (nextPhase4 !== phase4StateRef.current) {
      phase4StateRef.current = nextPhase4;
      animate(phase4, nextPhase4, { duration: DURATION, ease: EASE });
    }
  });

  // Text: slides left + fades
  const textX = useTransform(t, [0, 1], ["0vw", "-80vw"]);
  const textOpacity = useTransform(t, [0, 0.6], [1, 0]);

  // Card: bottom-right -> left/center, keep similar size, rotated back
  const cardX = useTransform(t, [0, 1], ["0vw", "-65vw"]);
  const cardY = useTransform(t, [0, 1], ["0vh", "-25vh"]);
  const cardScale = useTransform(t, [0, 1], [1, 0.7]);
  const cardRotate = useTransform(t, [0, 1], [10, -8]);

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
  const CARD_FINAL = { x: "-35vw", y: "-35vh", scale: 0.38, rotate: 0 };
  // Phase 4 — blue card slides into the leftmost tier slot
  const CARD_TIER_SLOT = { x: "-55.5vw", y: "-13.25vh", scale: 0.33, rotate: 0 };
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

  // Avoid stuck mid-state on unmount
  useEffect(() => () => { t.stop(); exit.stop(); }, [t, exit]);
  useEffect(() => () => { phase4.stop(); }, [phase4]);

  return (
    <div ref={containerRef} className="relative" style={{ height: "300vh" }}>
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
          className="relative z-10 flex flex-1 flex-col justify-center items-start gap-6 px-[6vw] md:gap-8 will-change-transform"
        >
          <h2
            className="m-0 font-semibold text-[#006080]"
            style={{ fontSize: "clamp(32px, 4.5vw, 64px)", lineHeight: 1.05 }}
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
            className="rounded-lg bg-[#006080] px-10 py-3.5 text-base font-semibold text-[#FDFDFC] transition-opacity hover:opacity-90"
          >
            Join now
          </button>
        </motion.div>

        <motion.img
          src={card}
          alt="ChamMiles Blue Tier card"
          draggable={false}
          className="pointer-events-none select-none absolute drop-shadow-2xl will-change-transform"
          style={{
            width: "40vw",
            right: "0vw",
            bottom: "-10vh",
            x: finalCardX,
            y: finalCardY,
            scale: finalCardScale,
            rotate: finalCardRotate,
            transformOrigin: "center center",
          }}
        />

        <motion.div
          style={{
            opacity: benefitsCombinedOpacity,
            x: benefitsX,
            y: benefitsExitY,
          }}
          className="absolute right-0 top-0 z-20 flex h-screen w-[50vw] flex-col justify-center gap-5 pl-[2vw] pr-[3vw] will-change-transform"
        >
          <h3
            className="m-0 font-semibold text-[#006080]"
            style={{ fontSize: "clamp(24px, 2.2vw, 34px)", lineHeight: 1.15 }}
          >
            Benefits that matter to you
          </h3>
          <p
            className="m-0 max-w-lg text-[#01263B]"
            style={{ fontSize: "clamp(13px, 1vw, 16px)", lineHeight: 1.5 }}
          >
            ChamMiles brings you closer to exclusive rewards, travel comfort,
            and privileges made for frequent flyers.
          </p>

          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {BENEFITS.map((b, i) => (
              <motion.li
                key={b.title}
                style={{ opacity: cardOpacities[i] }}
                className="flex items-start justify-between gap-4 rounded-xl bg-[#F5F5F4] p-4 shadow-sm will-change-[opacity] md:p-5"
              >
                <div className="min-w-0 flex-1">
                  <h4
                    className="m-0 mb-1 font-semibold text-[#006080]"
                    style={{ fontSize: "clamp(15px, 1.15vw, 18px)" }}
                  >
                    {b.title}
                  </h4>
                  <p
                    className="m-0 text-[#01263B]"
                    style={{ fontSize: "clamp(12px, 0.85vw, 14px)", lineHeight: 1.45 }}
                  >
                    {b.desc}
                  </p>
                </div>
                <img
                  src={b.img}
                  alt={b.title}
                  draggable={false}
                  className="h-16 w-24 shrink-0 rounded-md object-cover shadow-md md:h-[88px] md:w-[120px]"
                />
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Phase 3 — JoinEarly content rendered inside the same sticky scene */}
        <motion.div
          style={{ x: joinX, y: joinOutY, opacity: joinOpacity }}
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-[55vw] flex-col justify-center px-[6vw] will-change-transform"
        >
          <h2
            className="m-0 font-bold leading-[1.05] text-[#006080]"
            style={{ fontSize: "clamp(40px, 6vw, 88px)" }}
          >
            Join Early
          </h2>
          <h2
            className="m-0 font-bold leading-[1.05] text-[#C9B27A]"
            style={{ fontSize: "clamp(40px, 6vw, 88px)" }}
          >
            Earn
          </h2>
          <h2
            className="m-0 font-bold leading-[1.05] text-[#006080]"
            style={{ fontSize: "clamp(40px, 6vw, 88px)" }}
          >
            More
          </h2>
          <p
            className="m-0 mt-4 max-w-md text-[#01263B]"
            style={{ fontSize: "clamp(13px, 1vw, 16px)", lineHeight: 1.5 }}
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
          style={{ opacity: tiersTitleOpacity, y: tiersTitleY }}
          className="pointer-events-none absolute left-0 right-0 top-[12vh] z-10 m-0 text-center font-bold text-[#006080]"
        >
          <span style={{ fontSize: "clamp(40px, 5.5vw, 80px)" }}>Our Tiers</span>
        </motion.h2>

        <motion.div
          style={{ opacity: tierRowOpacity, y: tierRowY }}
          className="pointer-events-none absolute inset-x-0 bottom-[14vh] z-10 flex items-end justify-center gap-[3vw] px-[6vw] will-change-transform"
        >
          {[
            { img: null, title: "Blue Tire", sub: "Free to join" },
            { img: silverCard, title: "Silver Tire", sub: "25,000 Tier Miles" },
            { img: goldCard, title: "Gold Tire", sub: "50,000 Tier Miles" },
            { img: blackCard, title: "Diamond Tier", sub: "75,000 Tier Miles" },
          ].map((tier) => (
            <div key={tier.title} className="flex w-[14vw] flex-col items-center">
              {tier.img ? (
                <img
                  src={tier.img}
                  alt={tier.title}
                  draggable={false}
                  className="w-full select-none drop-shadow-xl"
                />
              ) : (
                <div className="w-full" style={{ aspectRatio: "1.6 / 1" }} />
              )}
              <div className="mt-3 text-center">
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
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          style={{ opacity: tierRowOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-[4vh] z-10 flex justify-center"
        >
          <button
            type="button"
            className="pointer-events-auto rounded-lg bg-[#006080] px-8 py-3 text-sm font-semibold text-[#FDFDFC] transition-opacity hover:opacity-90"
          >
            Become a Member
          </button>
        </motion.div>
      </section>
    </div>
  );
}
