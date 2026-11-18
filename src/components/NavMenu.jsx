import { NavLink } from "react-router-dom";
import { useState } from "react";

const LEVELS = [
  { n: "01", to: "/", label: "Character", sub: "identity / progress" },
  { n: "02", to: "/calories", label: "Calorie Tracker / AI Coach", sub: "daily intake" },
  { n: "03", to: "/routine", label: "Training", sub: "weekly split" },
  { n: "04", to: "/gymwear", label: "Loadout", sub: "kit / essentials" },
  { n: "05", to: "/donate", label: "Support", sub: "keep it moving" },
];

export default function NavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <aside className="relative z-20 w-full shrink-0 border-b border-[var(--line)] bg-[rgba(8,10,13,.82)] backdrop-blur-xl md:sticky md:top-0 md:h-screen md:w-[252px] md:border-b-0 md:border-r">
      <div className="flex items-start justify-between gap-5 px-5 py-5 md:block md:px-6 md:py-7">
        <NavLink to="/" onClick={() => setIsOpen(false)} className="group block">
          <div className="mb-4 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.22em] text-[var(--muted)]"><span className="h-2 w-2 bg-[var(--mint)]" /> personal system</div>
          <div className="font-display text-[28px] font-bold leading-[.9] tracking-[-.08em] text-[var(--text)]">NYXZ<span className="text-[var(--mint)]">.</span><br /><span className="text-[var(--muted)]">LAIR</span></div>
        </NavLink>
        <button onClick={() => setIsOpen(!isOpen)} className="button-quiet mt-1 md:hidden" aria-label="Toggle menu">{isOpen ? "close" : "menu"}</button>
      </div>
      <div className={`${isOpen ? "block" : "hidden"} border-t border-[var(--line)] md:block md:border-t-0`}>
        <div className="px-5 pb-3 pt-5 font-mono text-[9px] uppercase tracking-[.2em] text-[var(--muted)] md:px-6">navigation / 05</div>
        <nav className="px-3 pb-4 md:px-3">
          {LEVELS.map((lvl) => <NavLink key={lvl.to} to={lvl.to} end={lvl.to === "/"} onClick={() => setIsOpen(false)} className={({ isActive }) => `group relative mb-1 flex items-center gap-3 rounded-sm px-3 py-3 transition-all ${isActive ? "bg-[var(--surface-2)] text-[var(--mint)]" : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"}`}>
            {({ isActive }) => <><span className={`font-mono text-[10px] ${isActive ? "text-[var(--lime)]" : "text-[var(--muted)]"}`}>{lvl.n}</span><span className="flex flex-col"><span className="font-display text-[14px] font-semibold tracking-[-.02em]">{lvl.label}</span><span className="font-mono text-[9px] uppercase tracking-[.08em] opacity-60">{lvl.sub}</span></span>{isActive && <span className="absolute right-3 h-1.5 w-1.5 bg-[var(--mint)]" />}</>}
          </NavLink>)}
        </nav>
      </div>
      <div className="hidden border-t border-[var(--line)] px-6 py-5 md:block"><div className="mb-2 flex justify-between font-mono text-[9px] uppercase tracking-widest text-[var(--muted)]"><span>system status</span><span className="text-[var(--mint)]">online</span></div><div className="h-1 bg-[var(--surface-2)]"><div className="h-full w-[72%] bg-[var(--mint)]" /></div><p className="mt-3 font-mono text-[9px] leading-relaxed text-[var(--muted)]">"The big goal you've got, isn't gonna happen tomorrow or next week... but if you take small steps every day and keep doing them, and you just don't stop, it will happen one day."<br /> &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp;&nbsp; &nbsp;&nbsp; &nbsp;&nbsp; &nbsp;&nbsp; &nbsp; &nbsp; - David Laid</p></div>
    </aside>
  );
}
