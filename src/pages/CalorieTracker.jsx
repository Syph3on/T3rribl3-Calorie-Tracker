import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, supabaseReady, ensureAnonSession } from "../lib/supabaseClient";

const DEFAULT_GOALS = { calorie: 2200, protein: null, fat: null, carb: null };

// Local (not UTC) date as 'YYYY-MM-DD', matching Postgres `date` columns and
// <input type="date"> values, so comparisons/grouping never drift a day off
// near midnight in the user's own timezone.
function toLocalISODate(date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date - tzOffset).toISOString().split("T")[0];
}

export default function CalorieTracker() {
  const [entries, setEntries] = useState([]);
  const [food, setFood] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [entryDate, setEntryDate] = useState(() => toLocalISODate(new Date()));
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState("");

  const [userId, setUserId] = useState(null);
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [goalDraft, setGoalDraft] = useState(DEFAULT_GOALS);

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return; }
    (async () => {
      const id = await ensureAnonSession();
      setUserId(id);
      await fetchEntries();
      await fetchGoals(id);
      if (id) await fetchCoachHistory();
    })();
  }, []);

  async function fetchGoals(id) {
    if (!id) return;
    const { data, error: fetchErr } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();
    if (fetchErr) {
      console.warn("[goals] fetch failed:", fetchErr.message);
      return;
    }
    if (data) {
      const loaded = {
        calorie: data.daily_calorie_goal,
        protein: data.daily_protein_goal,
        fat: data.daily_fat_goal,
        carb: data.daily_carb_goal,
      };
      setGoals(loaded);
      setGoalDraft(loaded);
    } else {
      // First time this user's been seen — create their settings row with defaults.
      await supabase.from("user_settings").insert({ user_id: id, daily_calorie_goal: DEFAULT_GOALS.calorie });
    }
  }

  async function handleSaveGoals(e) {
    e.preventDefault();
    const nextGoals = {
      calorie: Number(goalDraft.calorie) || DEFAULT_GOALS.calorie,
      protein: goalDraft.protein === "" || goalDraft.protein === null ? null : Number(goalDraft.protein),
      fat: goalDraft.fat === "" || goalDraft.fat === null ? null : Number(goalDraft.fat),
      carb: goalDraft.carb === "" || goalDraft.carb === null ? null : Number(goalDraft.carb),
    };

    // Update the visible progress target first so the interface responds even
    // when anonymous Supabase auth is not configured yet.
    setGoals(nextGoals);
    setShowGoalEditor(false);
    if (!userId || !supabaseReady) return;

    const updated = {
      daily_calorie_goal: nextGoals.calorie,
      daily_protein_goal: nextGoals.protein,
      daily_fat_goal: nextGoals.fat,
      daily_carb_goal: nextGoals.carb,
      updated_at: new Date().toISOString(),
    };
    const { error: upsertErr } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId, ...updated });
    if (upsertErr) {
      setError(upsertErr.message);
      return;
    }
  }

  async function fetchEntries() {
    setLoading(true);
    const { data, error: fetchErr } = await supabase.from("calorie_entries").select("*").order("created_at", { ascending: false });
    if (fetchErr) setError(fetchErr.message);
    else setEntries(data);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!food.trim() || !calories) return;
    const payload = {
      food,
      calories: Number(calories),
      protein_g: protein === "" ? null : Number(protein),
      fat_g: fat === "" ? null : Number(fat),
      carbs_g: carbs === "" ? null : Number(carbs),
      log_date: entryDate,
    };
    if (editingId) {
      const { error: updateErr } = await supabase.from("calorie_entries").update(payload).eq("id", editingId);
      if (updateErr) setError(updateErr.message);
      setEditingId(null);
    } else {
      const { error: insertErr } = await supabase.from("calorie_entries").insert(payload);
      if (insertErr) setError(insertErr.message);
    }
    setFood("");
    setCalories("");
    setProtein("");
    setFat("");
    setCarbs("");
    // entryDate is intentionally left as-is — logging several things for the
    // same past/future day shouldn't require re-picking the date each time.
    fetchEntries();
  }

  async function handleDelete(id) {
    const { error: deleteErr } = await supabase.from("calorie_entries").delete().eq("id", id);
    if (deleteErr) setError(deleteErr.message);
    else fetchEntries();
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setFood(entry.food);
    setCalories(String(entry.calories));
    setProtein(entry.protein_g != null ? String(entry.protein_g) : "");
    setFat(entry.fat_g != null ? String(entry.fat_g) : "");
    setCarbs(entry.carbs_g != null ? String(entry.carbs_g) : "");
    setEntryDate(entry.log_date);
  }

  const [expandedDays, setExpandedDays] = useState(() => new Set([toLocalISODate(new Date())]));

  function toggleDay(dateKey) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  function formatDayLabel(dateKey) {
    const todayKey = toLocalISODate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateKey === todayKey) return "Today";
    if (dateKey === toLocalISODate(yesterday)) return "Yesterday";
    if (dateKey === toLocalISODate(tomorrow)) return "Tomorrow";
    const date = new Date(dateKey + "T00:00:00");
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  // Group flat entries into per-day buckets (by log_date, the day the user
  // chose — not created_at, which is just "when the row was inserted"),
  // newest day first.
  const groupedByDay = (() => {
    const groups = {};
    entries.forEach((entry) => {
      const dateKey = entry.log_date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((dateKey) => {
        const dayEntries = groups[dateKey];
        return {
          dateKey,
          label: formatDayLabel(dateKey),
          entries: dayEntries,
          dayTotal: dayEntries.reduce((sum, e) => sum + e.calories, 0),
          proteinTotal: dayEntries.reduce((sum, e) => sum + (e.protein_g || 0), 0),
          fatTotal: dayEntries.reduce((sum, e) => sum + (e.fat_g || 0), 0),
          carbTotal: dayEntries.reduce((sum, e) => sum + (e.carbs_g || 0), 0),
        };
      });
  })();

  const todayKey = toLocalISODate(new Date());

  // "Jump to date" filter — narrows the day list down to one specific date,
  // AND the intake bar above now follows whichever day is selected (defaults
  // to real today when nothing's filtered).
  const visibleGroups = dateFilter ? groupedByDay.filter((g) => g.dateKey === dateFilter) : groupedByDay;
  const displayDateKey = dateFilter || todayKey;
  const displayGroup = groupedByDay.find((g) => g.dateKey === displayDateKey);
  const displayLabel = dateFilter ? formatDayLabel(dateFilter) : "Today";
  const total = displayGroup ? displayGroup.dayTotal : 0;
  const pct = Math.min(100, (total / goals.calorie) * 100);

  function intakeLabelFor(label) {
    return ["Today", "Yesterday", "Tomorrow"].includes(label) ? `${label}'s intake` : `${label} intake`;
  }

  // Rolling 7-day summary (real calendar days, always ending today) — gives
  // the coach lightweight temporal context for relative questions ("this
  // week", "yesterday vs today") without sending the entire log history.
  // Independent of whatever day is being browsed via the filter above.
  function getRollingWeekSummary() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toLocalISODate(d);
      const group = groupedByDay.find((g) => g.dateKey === key);
      days.push({ label: formatDayLabel(key), total: group ? group.dayTotal : 0 });
    }
    return days.map((d) => `${d.label}: ${d.total} kcal`).join(", ");
  }

  // --- AI Coach chat state ---
  const [messages, setMessages] = useState([]); // { role: "user" | "assistant", text, fileNames? }[]
  const [coachInput, setCoachInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  async function fetchCoachHistory() {
    const { data, error: histErr } = await supabase
      .from("coach_messages")
      .select("*")
      .order("created_at", { ascending: true });
    if (histErr) {
      console.warn("[coach history] fetch failed:", histErr.message);
      return;
    }
    setMessages(
      data.map((row) => ({ role: row.role, text: row.content, fileNames: row.file_names || [] }))
    );
  }

  async function saveCoachMessage(role, text, fileNames = []) {
    if (!supabaseReady || !userId) return;
    const { error: insertErr } = await supabase
      .from("coach_messages")
      .insert({ role, content: text, file_names: fileNames });
    if (insertErr) console.warn("[coach history] save failed:", insertErr.message);
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, coachLoading]);

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
    e.target.value = ""; // allow re-selecting the same file later
  }

  function removeAttachedFile(index) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAskCoach(e) {
    e.preventDefault();
    if (!coachInput.trim() && attachedFiles.length === 0) return;

    const apiUrl = import.meta.env.VITE_AGENT_API_URL;
    const questionText = coachInput;
    const fileNames = attachedFiles.map((f) => f.name);

    // Snapshot exactly what's currently on screen, before this new message —
    // this becomes the model's entire memory for this request. No server-side
    // memory is relied on, so what you see is always what it knows.
    const historyForRequest = messages.map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, { role: "user", text: questionText, fileNames }]);
    saveCoachMessage("user", questionText, fileNames);

    if (!apiUrl) {
      const fallback = "Coach API isn't connected yet — set VITE_AGENT_API_URL in .env (see agent-server/README.md).";
      setMessages((prev) => [...prev, { role: "assistant", text: fallback }]);
      saveCoachMessage("assistant", fallback);
      setCoachInput("");
      setAttachedFiles([]);
      return;
    }

    setCoachLoading(true);
    const logSummary = displayGroup
      ? displayGroup.entries.map((e) => {
          const macros = [
            e.protein_g != null ? `${e.protein_g}g protein` : null,
            e.fat_g != null ? `${e.fat_g}g fat` : null,
            e.carbs_g != null ? `${e.carbs_g}g carbs` : null,
          ].filter(Boolean).join(", ");
          return `${e.food} (${e.calories} kcal${macros ? `, ${macros}` : ""})`;
        }).join(", ")
      : `nothing logged for ${displayLabel}`;
    const goalParts = [
      `${goals.calorie} kcal`,
      goals.protein != null ? `${goals.protein}g protein` : null,
      goals.fat != null ? `${goals.fat}g fat` : null,
      goals.carb != null ? `${goals.carb}g carbs` : null,
    ].filter(Boolean).join(", ");
    const calorieContext = `${displayLabel}'s log (the day currently shown on screen): ${logSummary}. Total so far: ${total}/${goals.calorie} kcal (protein ${displayGroup?.proteinTotal || 0}g, fat ${displayGroup?.fatTotal || 0}g, carbs ${displayGroup?.carbTotal || 0}g). Daily goal: ${goalParts}. Last 7 days (calorie totals only): ${getRollingWeekSummary()}.`;

    const formData = new FormData();
    formData.append("message", questionText);
    formData.append("calorie_context", calorieContext);
    formData.append("history", JSON.stringify(historyForRequest));
    attachedFiles.forEach((file) => formData.append("files", file));

    setCoachInput("");
    setAttachedFiles([]);

    try {
      const res = await fetch(`${apiUrl}/chat`, { method: "POST", body: formData });
      const data = await res.json();
      const replyText = data.reply || "No response.";
      setMessages((prev) => [...prev, { role: "assistant", text: replyText }]);
      saveCoachMessage("assistant", replyText);
    } catch {
      const failText = "Couldn't reach the coach API. Is the backend running/deployed?";
      setMessages((prev) => [...prev, { role: "assistant", text: failText }]);
      saveCoachMessage("assistant", failText);
    } finally {
      setCoachLoading(false);
    }
  }

  return (
    <div className="fuel-page page-shell max-w-none">
      <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="font-pixel text-[10px] text-amber mb-3">LEVEL 02</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display font-bold text-4xl md:text-5xl mb-6">Fuel Log</motion.h1>

      {!supabaseReady && (
        <div className="bg-panel border border-line rounded p-4 mb-6 font-mono text-xs text-muted">
          Connect Supabase to start logging entries — see README.md.
        </div>
      )}

      <div className="surface mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-2 mb-3 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted uppercase tracking-widest">{intakeLabelFor(displayLabel)}</span>
          <div className="flex items-center gap-3">
            <span className="text-ink">{total} / {goals.calorie} kcal</span>
            <button
              type="button"
              onClick={() => { setGoalDraft(goals); setShowGoalEditor((v) => !v); }}
              className="text-muted hover:text-cyan transition-colors underline underline-offset-2"
            >
              edit goals
            </button>
          </div>
        </div>
        <div className="stat-bar-track">
          <motion.div
            className="stat-bar-fill"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: pct > 100 ? "#FFB454" : "#4CE0D2" }}
          />
        </div>

        {(goals.protein != null || goals.fat != null || goals.carb != null) && (
          <div className="flex flex-wrap gap-4 mt-3 font-mono text-[10px] text-muted">
            {goals.protein != null && <span>protein {displayGroup?.proteinTotal || 0}/{goals.protein}g</span>}
            {goals.fat != null && <span>fat {displayGroup?.fatTotal || 0}/{goals.fat}g</span>}
            {goals.carb != null && <span>carbs {displayGroup?.carbTotal || 0}/{goals.carb}g</span>}
          </div>
        )}

        <AnimatePresence initial={false}>
          {showGoalEditor && (
            <motion.form
              onSubmit={handleSaveGoals}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-line">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-muted uppercase">calories</span>
                  <input type="number" value={goalDraft.calorie}
                    onChange={(e) => setGoalDraft((g) => ({ ...g, calorie: e.target.value }))}
                    className="bg-panelLight border border-line rounded px-2 py-1.5 text-sm text-ink outline-none focus:border-cyan" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-muted uppercase">protein (g)</span>
                  <input type="number" placeholder="optional" value={goalDraft.protein ?? ""}
                    onChange={(e) => setGoalDraft((g) => ({ ...g, protein: e.target.value }))}
                    className="bg-panelLight border border-line rounded px-2 py-1.5 text-sm text-ink placeholder:text-muted outline-none focus:border-cyan" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-muted uppercase">fat (g)</span>
                  <input type="number" placeholder="optional" value={goalDraft.fat ?? ""}
                    onChange={(e) => setGoalDraft((g) => ({ ...g, fat: e.target.value }))}
                    className="bg-panelLight border border-line rounded px-2 py-1.5 text-sm text-ink placeholder:text-muted outline-none focus:border-cyan" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] text-muted uppercase">carbs (g)</span>
                  <input type="number" placeholder="optional" value={goalDraft.carb ?? ""}
                    onChange={(e) => setGoalDraft((g) => ({ ...g, carb: e.target.value }))}
                    className="bg-panelLight border border-line rounded px-2 py-1.5 text-sm text-ink placeholder:text-muted outline-none focus:border-cyan" />
                </label>
              </div>
              <button type="submit" className="mt-3 font-mono text-xs uppercase tracking-wide bg-cyan text-void font-bold px-4 py-1.5 rounded hover:opacity-90 transition-opacity">
                save goals
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="surface mb-8 flex flex-col gap-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
          <input type="text" placeholder="food" value={food} onChange={(e) => setFood(e.target.value)} disabled={!supabaseReady}
            className="input-clean text-sm placeholder:text-muted disabled:opacity-40" />
          <input type="number" placeholder="kcal" value={calories} onChange={(e) => setCalories(e.target.value)} disabled={!supabaseReady}
            className="input-clean text-sm placeholder:text-muted disabled:opacity-40" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <label className="flex min-w-0 flex-col gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[.15em] text-muted">logging for</span>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} disabled={!supabaseReady}
              title="Which day this entry counts toward"
              className="input-clean min-w-0 text-sm disabled:opacity-40" />
          </label>
          <button type="button" onClick={() => setEntryDate(todayKey)} disabled={!supabaseReady} className="button-quiet sm:mb-0">
            today
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" placeholder="protein" value={protein} onChange={(e) => setProtein(e.target.value)} disabled={!supabaseReady}
            className="input-clean min-w-0 text-xs placeholder:text-muted disabled:opacity-40" />
          <input type="number" placeholder="fat" value={fat} onChange={(e) => setFat(e.target.value)} disabled={!supabaseReady}
            className="input-clean min-w-0 text-xs placeholder:text-muted disabled:opacity-40" />
          <input type="number" placeholder="carbs" value={carbs} onChange={(e) => setCarbs(e.target.value)} disabled={!supabaseReady}
            className="input-clean min-w-0 text-xs placeholder:text-muted disabled:opacity-40" />
        </div>
        <button type="submit" disabled={!supabaseReady}
            className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:self-end">
            {editingId ? "save" : "add"}
          </button>
      </form>

      {error && <p className="font-mono text-xs text-amber mb-4">{error}</p>}

      {groupedByDay.length > 0 && (
        <div className="surface mb-3 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[.15em] text-muted">browse log</span>
          <div className="flex min-w-0 items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input-clean min-w-0 flex-1 py-2 text-sm sm:flex-none"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter("")}
              className="shrink-0 font-mono text-[10px] text-muted underline underline-offset-2 hover:text-amber"
            >
              clear · show all days
            </button>
          )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="font-mono text-xs text-muted">loading…</p>
      ) : groupedByDay.length === 0 ? (
        supabaseReady && <p className="font-mono text-xs text-muted">nothing logged yet — add your first entry above</p>
      ) : visibleGroups.length === 0 ? (
        <p className="font-mono text-xs text-muted">nothing logged for that date</p>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((group) => {
            const isOpen = dateFilter ? true : expandedDays.has(group.dateKey);
            return (
              <div key={group.dateKey} className="bg-panel border border-line rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleDay(group.dateKey)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-panelLight/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-muted text-xs"
                    >
                      ▶
                    </motion.span>
                    <span className="font-display font-semibold text-sm text-ink">{group.label}</span>
                    <span className="font-mono text-[10px] text-muted">({group.entries.length} entries)</span>
                  </div>
                  <span className="font-mono text-xs text-cyan">{group.dayTotal} kcal</span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <ul className="space-y-2 p-3 pt-0">
                        <AnimatePresence initial={false}>
                          {group.entries.map((entry) => (
                            <motion.li
                              key={entry.id}
                              layout
                              initial={{ opacity: 0, y: -10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, x: 40, scale: 0.95 }}
                              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                              className="flex flex-col gap-3 bg-panelLight border border-line rounded px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm text-ink">{entry.food}</p>
                                <p className="font-mono text-[10px] text-muted">
                                  {entry.calories} kcal
                                  {(entry.protein_g != null || entry.fat_g != null || entry.carbs_g != null) && (
                                    <span className="text-muted/70">
                                      {" · "}
                                      {[
                                        entry.protein_g != null ? `${entry.protein_g}p` : null,
                                        entry.fat_g != null ? `${entry.fat_g}f` : null,
                                        entry.carbs_g != null ? `${entry.carbs_g}c` : null,
                                      ].filter(Boolean).join(" ")}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex gap-4 self-end font-mono text-xs sm:self-auto">
                                <button onClick={() => startEdit(entry)} className="text-muted hover:text-cyan transition-colors">edit</button>
                                <button onClick={() => handleDelete(entry.id)} className="text-muted hover:text-amber transition-colors">delete</button>
                              </div>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Coach */}
      <div className="surface mt-8 p-4 sm:mt-10 sm:p-5">
        <h2 className="font-display font-semibold text-sm text-cyan mb-1 uppercase tracking-wide">
          Ask Your Coach
        </h2>
        <p className="font-mono text-[10px] text-muted mb-4">
          fair warning — it's set up to roast you a little
        </p>

        {/* Chat history */}
        {messages.length > 0 && (
          <div className="max-h-80 overflow-y-auto mb-4 space-y-3 pr-1">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded p-3 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-cyan/10 border border-cyan/30 text-ink"
                        : "bg-panelLight border border-line text-ink"
                    }`}
                  >
                    {m.fileNames?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {m.fileNames.map((name, idx) => (
                          <span
                            key={idx}
                            className="font-mono text-[10px] text-muted bg-panel border border-line rounded px-2 py-0.5"
                          >
                            📎 {name}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {coachLoading && (
              <div className="flex justify-start">
                <div className="bg-panelLight border border-line rounded p-3 text-sm text-muted font-mono text-xs">
                  thinking…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map((file, i) => (
              <span
                key={i}
                className="flex items-center gap-2 font-mono text-[10px] text-ink bg-panelLight border border-line rounded px-2 py-1"
              >
                📎 {file.name}
                <button
                  type="button"
                  onClick={() => removeAttachedFile(i)}
                  className="text-muted hover:text-amber"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={handleAskCoach} className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.docx,.csv,.txt,.md"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={coachLoading}
            title="Attach a file"
            className="button-quiet w-full px-3 py-2 disabled:opacity-40 sm:w-auto"
          >
            📎
          </button>
          <input
            type="text"
            placeholder="e.g. is my intake okay today?"
            value={coachInput}
            onChange={(e) => setCoachInput(e.target.value)}
            disabled={coachLoading}
            className="input-clean text-sm placeholder:text-muted disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={coachLoading}
            className="button-primary w-full disabled:opacity-40 sm:w-auto"
          >
            {coachLoading ? "thinking…" : "ask"}
          </button>
        </form>
      </div>
    </div>
  );
}
