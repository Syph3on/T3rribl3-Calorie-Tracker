import { useRef, useEffect } from "react";

/**
 * Canvas-based particle "dissolve" effect: spawns small blocky pixel
 * particles along a horizontal line that sweeps upward in sync with a
 * cloud layer's own exit motion, drifting them down/sideways into the
 * revealed section below while they shrink and fade. Masks the hard edge
 * of a static cloud PNG scrolling away with a softer, organic transition
 * instead of a flat color swap.
 *
 * scrollYProgress: the same motion value driving the rest of the intro
 *                  (must be a Framer Motion MotionValue — this component
 *                  reads it imperatively via .get() inside a requestAnimationFrame
 *                  loop, not through React state, so it stays perfectly in
 *                  sync with scroll without re-rendering React on every frame).
 * edgeRange: [start, end] of scrollYProgress across which the sweep line
 *            travels from the bottom of the screen up past the top —
 *            should match the cloud's own "fully covering" point through
 *            its exit end (not the entrance phase).
 * colors: particle color palette, hex strings.
 * particleSize: [min, max] px of a particle at spawn (it shrinks from there).
 * spawnRate: particles spawned per animation frame while sweeping.
 */
export default function PixelDustCanvas({
  scrollYProgress,
  edgeRange,
  colors = ["#FFFFFF", "#D0DBFA", "#8BA8F7"],
  particleSize = [2, 5],
  spawnRate = 3,
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    function resize() {
      const parent = canvas.parentElement;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      sizeRef.current = { w, h };
      canvas.width = w;
      canvas.height = h;
    }
    resize();
    window.addEventListener("resize", resize);

    const [start, end] = edgeRange;

    function edgeYPixels(progress) {
      const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
      const { h } = sizeRef.current;
      // Sweeps from the very bottom (h) to a bit past the top (-10% of h)
      // so the trailing particles don't get cut off right at the edge.
      return h - t * h * 1.1;
    }

    function spawnAlong(yPixel) {
      const { w } = sizeRef.current;
      for (let i = 0; i < spawnRate; i++) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: yPixel + (Math.random() * 10 - 5),
          vx: (Math.random() - 0.5) * 0.6,
          vy: 0.4 + Math.random() * 0.8,
          size: particleSize[0] + Math.random() * (particleSize[1] - particleSize[0]),
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: 60 + Math.random() * 40,
        });
      }
    }

    function tick() {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      const progress = scrollYProgress.get();
      if (progress >= start && progress <= end + 0.05) {
        spawnAlong(edgeYPixels(progress));
      }

      const next = [];
      for (const particle of particlesRef.current) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life += 1;
        const lifeRatio = particle.life / particle.maxLife;
        const alpha = Math.max(0, 1 - lifeRatio);
        const currentSize = Math.max(0, particle.size * (1 - lifeRatio * 0.7));

        if (alpha > 0.02 && currentSize > 0.3) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = particle.color;
          // Blocky pixel-art look: flat filled squares, integer-rounded
          // position/size, no smoothing — reads as chunky "dust" rather
          // than soft anti-aliased dots.
          const px = Math.round(particle.x);
          const py = Math.round(particle.y);
          const s = Math.max(1, Math.round(currentSize));
          ctx.fillRect(px, py, s, s);
          next.push(particle);
        }
      }
      particlesRef.current = next;
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[29]"
    />
  );
}
