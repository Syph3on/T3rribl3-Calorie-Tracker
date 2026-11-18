import { motion } from "framer-motion";
export default function Reveal({ children, delay = 0, y = 24, className = "" }) { return <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .6, delay, ease: [.16, 1, .3, 1] }}>{children}</motion.div>; }
