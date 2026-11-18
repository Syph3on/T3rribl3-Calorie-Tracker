import { useState, useEffect } from "react";
import { motion, useTransform } from "framer-motion";

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

function ParallaxLayer({
  src,
  scrollYProgress,
  speed,
  opacity,
  blur,
  objectPosition,
  objectFit,
  scale,
  offsetX,
  fadeRange,
}) {
  // speed controls how far this layer travels across the FULL scroll range.
  // Small speed (e.g. 0.1) = drifts a little = reads as "far away".
  // Large speed (e.g. 0.6) = drifts a lot = reads as "close".
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${-speed * 100}%`]);

  // If fadeRange is given, this layer starts fully transparent and fades up
  // to its target opacity across that scroll window — hides an ugly edge
  // (like leftover padding baked into the source image) that would
  // otherwise be visible at rest (scroll position 0), before the layer's
  // own drift has moved it into a good-looking crop.
  const fadeOpacity = useTransform(
    scrollYProgress,
    fadeRange || [0, 1],
    fadeRange ? [0, opacity] : [opacity, opacity]
  );

  return (
    <motion.img
      src={src}
      alt=""
      style={{
        y,
        x: offsetX ?? 0,
        opacity: fadeRange ? fadeOpacity : opacity,
        filter: blur ? `blur(${blur}px)` : undefined,
        objectFit: objectFit || "cover",
        objectPosition: objectPosition || "center center",
        scale: scale ?? 1,
      }}
      className="absolute inset-0 w-full h-full"
    />
  );
}

/**
 * Ambient parallax background — a stack of images that each drift upward
 * at their own speed as the user scrolls through the whole intro (not just
 * during the cloud-wipe moment). Sits BEHIND the sprite/title/clouds.
 *
 * layers: array of {
 *   src, speed, opacity?, blur?, objectPosition?, objectFit?, scale?,
 *   offsetX?, fadeRange?
 * } — see individual field docs in the original version of this file, or
 * just match the shape of your existing `layers` array.
 *
 * fadeRange (new): optional [start, end] of scrollYProgress (0-1). If set,
 * the layer starts invisible and fades up to its normal opacity across that
 * window instead of being visible immediately. Use this when a layer looks
 * bad at rest (scroll position 0) — e.g. leftover padding/background fill
 * baked into the source PNG showing at an edge — but looks fine once it's
 * drifted a bit. A small range like [0, 0.06] usually does it.
 *
 * mobileLayers: optional SEPARATE array, same shape, used instead of
 * `layers` on narrow screens (<768px wide by default). A background
 * composed for a wide desktop screen almost always needs different
 * cropping/positioning (or even different, simpler art) on a tall narrow
 * phone screen — object-fit: cover has to zoom in much further to
 * guarantee full-width coverage on a narrow viewport, which is what causes
 * mismatched-looking crops. If you don't pass `mobileLayers`, `layers` is
 * used everywhere (same as before).
 *
 * Example — fixing an ugly bottom edge on the mountain layer:
 *   layers={[
 *     { src: sky, speed: 0.05, objectPosition: "center top" },
 *     { src: mountains, speed: 0.15, objectPosition: "center bottom", fadeRange: [0, 0.06] },
 *   ]}
 *
 * edgeFade: { top?, bottom? } as fractions of viewport height (0-1),
 * defaults to { top: 0.08, bottom: 0.12 }. Fades the ENTIRE layer stack to
 * transparent right at the top/bottom edges of the screen — since the
 * page background behind it is solid black, this reads as a soft vignette
 * into black rather than an effect. This is the blunt, reliable fix for
 * "different layers move at different speeds/sizes so a seam shows up
 * somewhere" — instead of chasing perfect alignment at every scroll
 * position, the edges where mismatches would be visible are just always
 * softly hidden. Pass `edgeFade={false}` to disable entirely.
 */
export default function ParallaxBackground({
  scrollYProgress,
  layers = [],
  mobileLayers,
  edgeFade = { top: 0.08, bottom: 0.12 },
}) {
  const isMobile = useIsMobile();
  const activeLayers = isMobile && mobileLayers ? mobileLayers : layers;

  if (activeLayers.length === 0) return null;

  const maskStyle = edgeFade
    ? (() => {
        const topPct = (edgeFade.top ?? 0) * 100;
        const bottomPct = 100 - (edgeFade.bottom ?? 0) * 100;
        const gradient = `linear-gradient(to bottom, transparent 0%, black ${topPct}%, black ${bottomPct}%, transparent 100%)`;
        return { maskImage: gradient, WebkitMaskImage: gradient };
      })()
    : {};

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={maskStyle}>
      {activeLayers.map((layer, i) => (
        <ParallaxLayer
          key={i}
          src={layer.src}
          scrollYProgress={scrollYProgress}
          speed={layer.speed ?? 0.2}
          opacity={layer.opacity ?? 1}
          blur={layer.blur ?? 0}
          objectPosition={layer.objectPosition}
          objectFit={layer.objectFit}
          scale={layer.scale}
          offsetX={layer.offsetX}
          fadeRange={layer.fadeRange}
        />
      ))}
    </div>
  );
}
