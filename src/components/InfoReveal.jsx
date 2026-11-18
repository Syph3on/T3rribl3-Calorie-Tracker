import { motion, useTransform } from "framer-motion";

const SECTIONS = [
  { n: "01", title: "Fuel Log", desc: "Track meals, macros, and daily goals" },
  { n: "02", title: "Training", desc: "A weekly split, one day at a time" },
  { n: "03", title: "Loadout", desc: "Gymwear built for the grind" },
  { n: "04", title: "Support", desc: "Fuel the journey forward" },
];

const THEMES = {
  dark: {
    label: "text-cyan/80",
    cardBorder: "border-ink/20",
    cardBg: "bg-black/30",
    title: "text-ink",
    desc: "text-ink/70",
    bio: "text-ink/50",
  },
  light: {
    label: "text-cyan-700",
    cardBorder: "border-black/10",
    cardBg: "bg-white/40",
    title: "text-void",
    desc: "text-void/70",
    bio: "text-void/50",
  },
};

function RevealBlock({ scrollYProgress, range, children, className = "" }) {
  const opacity = useTransform(scrollYProgress, range, [0, 1]);
  const y = useTransform(scrollYProgress, range, [20, 0]);
  return (
    <motion.div style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Sits between the wipe curtain/clouds and the blackout layer in
 * CinematicIntro — fades in a grid of "what's on this site" teasers, then
 * gets covered by the blackout as the intro finishes.
 *
 * images: optional array of image imports, index-matched to SECTIONS.
 * theme: "dark" (default, for a black/colored backdrop) or "light" (for a
 *        white/pale backdrop, e.g. when using CloudWipe's backdropColor).
 */
export default function InfoReveal({ scrollYProgress, images = [], theme = "dark" }) {
  const t = THEMES[theme] || THEMES.dark;
  return (
    <div className="absolute inset-0 z-[33] flex items-center justify-center pointer-events-none px-6">
      <div className="max-w-3xl w-full">
        <RevealBlock scrollYProgress={scrollYProgress} range={[0.6, 0.68]}>
          <p className={`font-mono text-[10px] ${t.label} uppercase tracking-[0.3em] text-center mb-6`}>
            What you'll find
          </p>
        </RevealBlock>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {SECTIONS.map((s, i) => {
            const img = images[i];
            return (
              <RevealBlock
                key={s.n}
                scrollYProgress={scrollYProgress}
                range={[0.64 + i * 0.035, 0.75 + i * 0.035]}
                className={`relative overflow-hidden rounded border ${t.cardBorder} aspect-[4/3]`}
              >
                {img ? (
                  <>
                    <img src={img} alt={s.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  </>
                ) : (
                  <div className={`absolute inset-0 ${t.cardBg} backdrop-blur-sm`} />
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <span className="font-mono text-[10px] text-amber">{s.n}</span>
                  <h3 className={`font-display font-semibold text-sm md:text-base ${img ? "text-ink" : t.title} mt-1`}>
                    {s.title}
                  </h3>
                  <p className={`font-mono text-[10px] ${img ? "text-ink/70" : t.desc} mt-1`}>{s.desc}</p>
                </div>
              </RevealBlock>
            );
          })}
        </div>

        <RevealBlock scrollYProgress={scrollYProgress} range={[0.83, 0.9]}>
          <p className={`font-mono text-[10px] ${t.bio} text-center mt-6 max-w-md mx-auto leading-relaxed`}>
            One line about who you are and why this exists — edit me in InfoReveal.jsx
          </p>
        </RevealBlock>
      </div>
    </div>
  );
}
