import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import InfoReveal from "./InfoReveal";
import CloudWipe from "./CloudWipe";
import ParallaxBackground from "./ParallaxBackground";

function PlaceholderSprite() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" style={{ imageRendering: "pixelated" }}>
      <rect x="24" y="8" width="16" height="16" fill="#4CE0D2" />
      <rect x="16" y="24" width="32" height="24" fill="#FFB454" />
      <rect x="16" y="48" width="10" height="12" fill="#2A8B82" />
      <rect x="38" y="48" width="10" height="12" fill="#2A8B82" />
    </svg>
  );
}

const WIPE_THEMES = {
  mist: "linear-gradient(to top, #000000 0%, #17414A 45%, #4CE0D2 100%)",
  fire: "linear-gradient(to top, #1A0500 0%, #B33B0E 45%, #FFB454 100%)",
  water: "linear-gradient(to top, #00131F 0%, #0E4D68 45%, #4CE0D2 100%)",
  darkness: "linear-gradient(to top, #000000 0%, #000000 100%)",
};

/**
 * Pinned scroll sequence:
 * 1) sprite frame-animates at a fixed size (0 -> 0.35), then fades out (0.35 -> 0.5)
 * 2) the screen gets fully covered — either a themed gradient curtain, OR
 *    (if `cloudImages` is passed) stacked cloud layers that rise up and
 *    off-screen one after another (0.35 -> 0.58)
 * 3) info cards appear on the now-clean backdrop (0.6 -> 0.9)
 * 4) the screen settles to solid black (0.9 -> 0.98)
 *
 * Props:
 * - frames / spriteUrl: sprite animation, see original docs.
 * - wipeTheme: "mist" | "fire" | "water" | "darkness" — used only if
 *              `cloudImages` isn't given.
 * - cloudImages: array of image imports. If given, replaces the gradient
 *                curtain with CloudWipe.
 * - cloudTile: true (default) tiles each cloud image as a repeating
 *              pattern; false renders one big image per layer via
 *              object-cover (no repetition) — use this for a single full
 *              cloud scene rather than a small repeating graphic.
 * - cloudTileSize: px width per tile, only relevant when cloudTile=true.
 * - mobileCloudImages: separate cloud image(s) used on narrow screens
 *                      instead of cloudImages — same reasoning as
 *                      mobileParallaxLayers. See CloudWipe.jsx.
 * - cloudObjectFit: "cover" (default — fills screen, guaranteed no gaps)
 *                   or "contain" (shows whole image, may letterbox). Only
 *                   used when cloudTile=false.
 * - cloudObjectPosition / cloudScale: anchor point and static zoom for a
 *                                     single (cloudTile=false) cloud image.
 * - mobileCloudObjectFit / mobileCloudObjectPosition / mobileCloudScale:
 *   override those three on narrow screens — if the cloud looks
 *   "contained"/letterboxed on mobile, set mobileCloudObjectFit="cover"
 *   explicitly (or just a bigger mobileCloudScale).
 * - cloudBackdropColor: optional CSS color (e.g. "#FFFFFF") — a solid
 *                       color that rises into place using the SAME timing
 *                       as the cloud itself, sitting directly behind it,
 *                       revealed the instant the cloud clears. Held until
 *                       the black settle takes over. See CloudWipe.jsx.
 * - cloudDissolveParticles: boolean. If true, a canvas particle "dust"
 *                           effect sweeps upward in sync with the cloud's
 *                           exit instead of/alongside a flat backdrop —
 *                           a softer transition for a static PNG. See
 *                           PixelDustCanvas.jsx.
 * - cloudParticleColors: color palette for the dust effect, hex strings.
 * - infoImages: optional array of images for the info cards.
 * - infoTheme: "dark" (default) or "light" — set to "light" when using a
 *              white/pale cloudBackdropColor so the cards stay readable.
 * - parallaxLayers / mobileParallaxLayers / parallaxEdgeFade: see
 *   ParallaxBackground.jsx.
 */
export default function CinematicIntro({
  frames,
  spriteUrl,
  wipeTheme = "mist",
  cloudImages,
  mobileCloudImages,
  cloudTile = true,
  cloudTileSize = 420,
  cloudObjectFit,
  cloudObjectPosition,
  cloudScale,
  mobileCloudObjectFit,
  mobileCloudObjectPosition,
  mobileCloudScale,
  cloudBackdropColor,
  cloudDissolveParticles = false,
  cloudParticleColors,
  infoImages = [],
  infoTheme = "dark",
  parallaxLayers = [],
  mobileParallaxLayers,
  parallaxEdgeFade,
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const frameList = frames && frames.length > 0 ? frames : spriteUrl ? [spriteUrl] : null;
  const [frameIndex, setFrameIndex] = useState(0);

  const frameProgress = useTransform(scrollYProgress, [0, 0.35], [0, frameList ? frameList.length - 1 : 0]);
  useMotionValueEvent(frameProgress, "change", (v) => {
    const idx = Math.round(v);
    setFrameIndex((prev) => (prev !== idx ? idx : prev));
  });

  const spriteOpacity = useTransform(scrollYProgress, [0.35, 0.5], [1, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);
  const wipeScale = useTransform(scrollYProgress, [0.35, 0.58], [0, 1]);
  const blackoutOpacity = useTransform(scrollYProgress, [0.9, 0.98], [0, 1]);
  const revealOpacity = useTransform(scrollYProgress, [0.93, 1], [0, 1]);
  const revealY = useTransform(scrollYProgress, [0.93, 1], [30, 0]);

  return (
    <div ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
        <ParallaxBackground
          scrollYProgress={scrollYProgress}
          layers={parallaxLayers}
          mobileLayers={mobileParallaxLayers}
          edgeFade={parallaxEdgeFade}
        />

        <motion.div style={{ opacity: titleOpacity, y: titleY }} className="absolute top-20 md:top-28 text-center z-20 px-6">
          <p className="font-mustardo text-cyan text-[10px] mb-3">SCROLL TO BEGIN</p>
          <h1 className="font-akira font-bold text-3xl md:text-5xl">Your Journey Starts Here</h1>
        </motion.div>

        <motion.div
          style={{ opacity: spriteOpacity }}
          className="relative z-10 w-[clamp(320px,55vw,680px)] h-[clamp(320px,55vw,680px)]"
        >
          {frameList ? (
            <img
              src={frameList[frameIndex]}
              alt="Character animation frame"
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <PlaceholderSprite />
          )}
        </motion.div>

        {cloudImages && cloudImages.length > 0 ? (
          <CloudWipe
            images={cloudImages}
            mobileImages={mobileCloudImages}
            scrollYProgress={scrollYProgress}
            range={[0.35, 0.58]}
            tile={cloudTile}
            tileSize={cloudTileSize}
            objectFit={cloudObjectFit}
            objectPosition={cloudObjectPosition}
            scale={cloudScale}
            mobileObjectFit={mobileCloudObjectFit}
            mobileObjectPosition={mobileCloudObjectPosition}
            mobileScale={mobileCloudScale}
            backdropColor={cloudBackdropColor}
            dissolveParticles={cloudDissolveParticles}
            particleColors={cloudParticleColors}
          />
        ) : (
          <motion.div
            style={{ scaleY: wipeScale, transformOrigin: "bottom", background: WIPE_THEMES[wipeTheme] || WIPE_THEMES.mist }}
            className="absolute inset-0 z-30 pointer-events-none"
          />
        )}

        <InfoReveal scrollYProgress={scrollYProgress} images={infoImages} theme={infoTheme} />

        <motion.div style={{ opacity: blackoutOpacity }} className="absolute inset-0 z-[36] bg-void pointer-events-none" />

        <motion.div style={{ opacity: revealOpacity, y: revealY }} className="absolute z-40 text-center px-6">
          <p className="font-mustardo text-amber text-[10px] mb-3">LEVEL 01</p>
          <p className="font-milkyway font-semibold text-xl md:text-2xl text-ink">Loading Character Sheet…</p>
        </motion.div>
      </div>
    </div>
  );
}
