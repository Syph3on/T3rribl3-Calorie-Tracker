import { motion, useScroll, useSpring, useTransform } from "framer-motion";
export default function ScrollFX() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: .25 });
  const y = useTransform(smooth, [0, 1], [0, -180]);
  return <><motion.div className="fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-[var(--mint)]" style={{ scaleX: smooth }} /><motion.div className="glow-blob left-[18%] top-[16%] h-72 w-72 bg-[var(--mint)]" style={{ y }} /><motion.div className="glow-blob bottom-[8%] right-[10%] h-64 w-64 bg-[var(--coral)]" style={{ y: useTransform(smooth, [0, 1], [0, 160]) }} /></>;
}
