import { motion } from "framer-motion";

export default function StatBar({ label, value, max = 100, color = "cyan" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = color === "amber" ? "#FFB454" : "#4CE0D2";
  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {label}
        </span>
        <span className="font-mono text-xs text-ink">
          {value}/{max}
        </span>
      </div>
      <div className="stat-bar-track">
        <motion.div
          className="stat-bar-fill"
          style={{ background: fill }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
