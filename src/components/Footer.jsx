import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "character" },
  { to: "/calories", label: "fuel log" },
  { to: "/routine", label: "training" },
  { to: "/gymwear", label: "loadout" },
  { to: "/donate", label: "support" },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[var(--line)] bg-[rgba(8,10,13,.72)] px-5 py-8 backdrop-blur-xl md:px-12 md:py-10">
      <div className="mx-auto grid max-w-[1180px] gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-2 w-2 bg-[var(--mint)] shadow-[0_0_14px_rgba(168,240,208,.65)]" />
            <span className="font-mono text-[9px] uppercase tracking-[.2em] text-[var(--muted)]">nyxz / personal system</span>
          </div>
          <p className="max-w-md font-display text-xl font-semibold tracking-[-.04em] text-[var(--text)]">Keep showing up<span className="text-[var(--mint)]">.</span></p>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">A small corner for training, food, and the long game.</p>
        </div>
        <div className="md:text-right">
          <nav aria-label="Footer navigation" className="mb-5 flex flex-wrap gap-x-5 gap-y-3 md:justify-end">
            {LINKS.map((link) => <NavLink key={link.to} to={link.to} end={link.to === "/"} className="font-mono text-[10px] uppercase tracking-[.13em] text-[var(--muted)] transition-colors hover:text-[var(--mint)]">{link.label}</NavLink>)}
          </nav>
          <div className="flex flex-wrap gap-4 font-mono text-[9px] uppercase tracking-[.14em] text-[var(--muted)] md:justify-end">
            <span>status <b className="font-normal text-[var(--mint)]">online</b></span>
            <span>build <b className="font-normal text-[var(--lime)]">01.05</b></span>
            <span>made with intent</span>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-[1180px] items-center gap-3 font-mono text-[9px] uppercase tracking-[.18em] text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--line)]" /><span>Consistency. no perfect days required</span><span className="h-px flex-1 bg-[var(--line)]" /></div>
    </footer>
  );
}
