import { useState, useEffect } from "react";
import { motion, useTransform } from "framer-motion";
import PixelDustCanvas from "./PixelDustCanvas";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

function CloudLayer({
  src,
  scrollYProgress,
  layerStart,
  layerEnd,
  coverFraction,
  tileSize,
  tile,
  objectPosition,
  objectFit,
  scale,
}) {
  const layerSpan = layerEnd - layerStart;
  const coverPoint = layerStart + layerSpan * coverFraction;

  // Three phases:
  // 1) before layerStart: parked at 100% (fully below the viewport, hidden —
  //    this is what keeps it off whatever's animating before this point)
  // 2) layerStart -> coverPoint: rises up into place (100% -> 0%, fully covering)
  // 3) coverPoint -> layerEnd: continues rising off the top (0% -> -130%),
  //    clearing away to reveal what's behind
  const y = useTransform(
    scrollYProgress,
    [layerStart, coverPoint, layerEnd],
    ["100%", "0%", "-130%"]
  );

  if (tile) {
    return (
      <motion.div
        style={{
          y,
          backgroundImage: `url(${src})`,
          backgroundRepeat: "repeat",
          backgroundSize: `${tileSize}px auto`,
        }}
        className="absolute inset-0 w-full h-full"
      />
    );
  }

  // Single big image, stretched/cropped to fill the whole screen (or
  // letterboxed, if objectFit="contain"). objectPosition/scale let you
  // re-anchor and re-crop it per viewport (pass different values via
  // mobileObjectPosition/mobileScale/mobileObjectFit on CloudWipe for
  // narrow screens).
  return (
    <motion.img
      src={src}
      alt=""
      style={{
        y,
        objectFit: objectFit || "cover",
        objectPosition: objectPosition || "center center",
        scale: scale ?? 1,
      }}
      className="absolute inset-0 w-full h-full"
    />
  );
}

/**
 * Stacked images (clouds, fog, whatever) that stay OFF-SCREEN (below the
 * viewport) until `range[0]`, then rise up to fully cover the screen, then
 * continue rising off the top to reveal what's behind — one layer after
 * another for a parallax "rising up through clouds" feel.
 *
 * images: array of image imports, e.g. [cloud1, cloud2, cloud3]
 * mobileImages: optional separate array used on narrow screens (<768px by
 *               default) instead of `images`.
 * range: [start, end] of scrollYProgress (0-1) this whole effect spans.
 * coverFraction: how much of each layer's own window is spent rising into
 *                place vs. floating away afterward (0.35 default).
 * tile: true (default) repeats each image as a pattern. Set false for one
 *       big image (cropped/fit via objectFit instead of repeated).
 * tileSize: width in px of each repeated tile (only used when tile=true).
 * objectFit / objectPosition / scale: only used when tile=false.
 *   objectFit: "cover" (default, fills & crops, guarantees no gaps) or
 *              "contain" (shows the whole image, may letterbox).
 *   objectPosition: anchor point when cropped, e.g. "center bottom".
 *   scale: static zoom (1 = no zoom).
 * mobileObjectFit / mobileObjectPosition / mobileScale: override the above
 *   three on narrow screens — a cloud scene composed for desktop almost
 *   always needs a different crop/zoom on a tall phone screen, same
 *   reasoning as ParallaxBackground's mobile overrides. If the whole cloud
 *   looks "contained"/letterboxed on mobile, you very likely want
 *   mobileObjectFit="cover" explicitly (or just a bigger mobileScale).
 * backdropColor: optional CSS color (e.g. "#FFFFFF"). A solid color layer
 *                that rises into place using the EXACT SAME motion/timing
 *                as the first cloud layer, sitting directly behind it,
 *                revealed the instant the cloud clears. Holds in place
 *                afterward until something later (like a black settle-out)
 *                covers it. NOTE: if the cloud image itself has internal
 *                transparent gaps (not just edges), this backdrop will
 *                show through those gaps too, which can look like it's
 *                "in front of" parts of the cloud — that's usually a sign
 *                the cloud isn't using objectFit="cover" properly, or the
 *                source art has unintended transparency. Consider
 *                dissolveParticles instead for a softer, more forgiving
 *                transition that doesn't rely on a hard-edged cloud shape.
 * dissolveParticles: boolean. If true, renders a canvas particle "dust"
 *                    effect (see PixelDustCanvas.jsx) that sweeps upward
 *                    in sync with the first cloud layer's exit, instead of
 *                    (or alongside) backdropColor — a softer transition
 *                    that masks a static PNG's hard edge.
 * particleColors: color palette for dissolveParticles, hex strings.
 */
export default function CloudWipe({
  images,
  mobileImages,
  scrollYProgress,
  range = [0.35, 0.6],
  coverFraction = 0.35,
  tile = true,
  tileSize = 420,
  objectFit,
  objectPosition,
  scale,
  mobileObjectFit,
  mobileObjectPosition,
  mobileScale,
  backdropColor,
  dissolveParticles = false,
  particleColors,
}) {
  const isMobile = useIsMobile();
  const activeImages = isMobile && mobileImages ? mobileImages : images;
  const activeObjectFit = isMobile && mobileObjectFit ? mobileObjectFit : objectFit;
  const activeObjectPosition = isMobile && mobileObjectPosition ? mobileObjectPosition : objectPosition;
  const activeScale = isMobile && mobileScale != null ? mobileScale : scale;

  const [start, end] = range;
  const span = end - start;

  // Backdrop uses the SAME two keyframes as the first cloud layer's entrance
  // (layerStart = start, coverPoint = start + span*coverFraction), then
  // holds at "0%" (fully in place) indefinitely afterward — no separate
  // opacity timing to drift out of sync with the cloud's own motion.
  const firstCoverPoint = start + span * coverFraction;
  const backdropY = useTransform(scrollYProgress, [start, firstCoverPoint, 1], ["100%", "0%", "0%"]);

  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
      {backdropColor && (
        <motion.div
          style={{ y: backdropY, backgroundColor: backdropColor }}
          className="absolute inset-0 w-full h-full"
        />
      )}

      {dissolveParticles && (
        <PixelDustCanvas
          scrollYProgress={scrollYProgress}
          edgeRange={[firstCoverPoint, end]}
          colors={particleColors}
        />
      )}

      {activeImages.map((src, i) => {
        const stagger = i * (span * 0.15);
        return (
          <CloudLayer
            key={i}
            src={src}
            scrollYProgress={scrollYProgress}
            layerStart={start + stagger}
            layerEnd={end + stagger}
            coverFraction={coverFraction}
            tileSize={tileSize}
            tile={tile}
            objectFit={activeObjectFit}
            objectPosition={activeObjectPosition}
            scale={activeScale}
          />
        );
      })}
    </div>
  );
}
