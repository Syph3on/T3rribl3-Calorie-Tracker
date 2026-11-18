import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import NavMenu from "./components/NavMenu";
import ScrollFX from "./components/ScrollFX";
import Home from "./pages/Home";
import CalorieTracker from "./pages/CalorieTracker";
import GymRoutine from "./pages/GymRoutine";
import Gymwear from "./pages/Gymwear";
import Donate from "./pages/Donate";
import Footer from "./components/Footer";

function PageTransition({ children }) { return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .4, ease: [.16, 1, .3, 1] }}>{children}</motion.div>; }
export default function App() {
  const location = useLocation();
  return <div className="relative flex min-h-screen flex-col bg-[var(--bg)] md:flex-row"><ScrollFX /><NavMenu /><div className="flex min-w-0 flex-1 flex-col"><main className="relative z-10 flex-1"><AnimatePresence mode="wait"><Routes location={location} key={location.pathname}><Route path="/" element={<PageTransition><Home /></PageTransition>} /><Route path="/calories" element={<PageTransition><CalorieTracker /></PageTransition>} /><Route path="/routine" element={<PageTransition><GymRoutine /></PageTransition>} /><Route path="/gymwear" element={<PageTransition><Gymwear /></PageTransition>} /><Route path="/donate" element={<PageTransition><Donate /></PageTransition>} /></Routes></AnimatePresence></main><Footer /></div></div>;
}
