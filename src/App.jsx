import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase ───────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── DB helpers ─────────────────────────────────────────────────────────────
const DB = {
  // Weekly logs
  async getWeek(weekKey) {
    const { data } = await supabase.from("weekly_logs").select("*").eq("week_key", weekKey).single();
    return data;
  },
  async upsertWeek(weekKey, payload) {
    await supabase.from("weekly_logs").upsert({ week_key: weekKey, ...payload }, { onConflict: "week_key" });
  },
  async getAllWeeks() {
    const { data } = await supabase.from("weekly_logs").select("*").order("week_key", { ascending: false });
    return data || [];
  },
  // Weight entries
  async getWeights() {
    const { data } = await supabase.from("weight_entries").select("*").order("entry_date", { ascending: true });
    return data || [];
  },
  async upsertWeight(date, weightLbs) {
    await supabase.from("weight_entries").upsert({ entry_date: date, weight_lbs: weightLbs }, { onConflict: "entry_date" });
  },
  // Health metrics history
  async getHealthMetrics() {
    const { data } = await supabase
      .from("health_metrics")
      .select("recorded_at, vo2_max, resting_hr, hrv_ms, total_daily_steps, weight_lbs")
      .order("recorded_at", { ascending: true });
    return data || [];
  },
  // Workout last-done (stored in weekly_logs notes field as a JSON aside — simplest approach)
  async getLastWorkout() {
    const { data } = await supabase.from("weekly_logs").select("notes").eq("week_key", "__workout_meta__").single();
    try { return data ? JSON.parse(data.notes) : {}; } catch { return {}; }
  },
  async setLastWorkout(obj) {
    await supabase.from("weekly_logs").upsert({ week_key: "__workout_meta__", cardio: 0, strength: 0, steps: 0, notes: JSON.stringify(obj) }, { onConflict: "week_key" });
  },
};

// ── Date helpers ───────────────────────────────────────────────────────────
function getMonday(d = new Date()) {
  const day = d.getDay(), diff = day === 0 ? -6 : 1 - day, mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
}
function currentWeekKey() {
  const mon = getMonday();
  return `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,"0")}-${String(mon.getDate()).padStart(2,"0")}`;
}
function weekLabel(key) {
  if (!key || key === "__workout_meta__") return "";
  const [y, m, d] = key.split("-");
  return new Date(+y, +m-1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " week";
}
function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dateLabelFromStr(str) {
  const [y, m, d] = str.split("-");
  return new Date(+y, +m-1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function defaultWeek() { return { cardio: 0, strength: 0, steps: 0, notes: "" }; }

// ── Constants ──────────────────────────────────────────────────────────────
const WEIGHT_TARGET = 200;
const WEEK_TARGETS = { cardio: 2, strength: 1, steps: 4 };

const ACCENT = "#4ade80";
const BG = "#0f1117";
const CARD = "#161b27";
const CARD2 = "#1c2333";
const BORDER = "#2a3347";
const TEXT = "#e2e8f0";
const MUTED = "#64748b";
const DANGER = "#f87171";
const GOLD = "#fbbf24";
const BLUE = "#60a5fa";
const PURPLE = "#a78bfa";
const PINK = "#f472b6";

const TAG_COLORS = {
  PRIORITY: { bg: "#1a2e1a", color: "#4ade80", border: "#2d5a2d" },
  IMPORTANT: { bg: "#1e2a1a", color: "#a3e635", border: "#3a4f1a" },
  HABIT: { bg: "#1a2233", color: "#60a5fa", border: "#1e3a5f" },
};

const MUSCLE_COLORS = {
  Legs: "#4ade80", Chest: "#60a5fa", Back: "#a78bfa",
  Shoulders: "#f472b6", Core: "#fbbf24", Arms: "#fb923c",
};

const WORKOUTS = [
  {
    id: "A", title: "Workout A", subtitle: "Squat · Press · Row", color: ACCENT,
    focus: "Quads, Chest, Upper Back", duration: "35–45 min",
    exercises: [
      { name: "Goblet Squat", muscle: "Legs", sets: "3 × 10–12", weight: "Moderate–Heavy (25–45 lb)", cue: "Hold one dumbbell vertically at chest. Feet shoulder-width, toes slightly out. Sit deep, keeping chest tall and knees tracking over toes. Drive through heels to stand.", video: "https://www.youtube.com/watch?v=MeIiIdhvXT4", videoLabel: "Goblet Squat — Alan Thrall" },
      { name: "DB Floor Press", muscle: "Chest", sets: "3 × 10–12", weight: "Moderate (25–40 lb each)", cue: "Lie on floor. Hold dumbbells at chest level, elbows ~45° from torso. Press straight up, lock out, lower slowly. Floor limits depth safely and reduces shoulder strain.", video: "https://www.youtube.com/watch?v=VmB1G1K7v94", videoLabel: "DB Floor Press — Jeff Nippard" },
      { name: "Bent-Over Row", muscle: "Back", sets: "3 × 10–12 each", weight: "Moderate–Heavy (30–50 lb)", cue: "Hinge at hips, back flat, chest parallel to floor. Pull dumbbell to hip, leading with elbow. Pause at top, lower controlled. Brace core throughout.", video: "https://www.youtube.com/watch?v=pYcpY20QaE8", videoLabel: "DB Row — Jeff Nippard" },
      { name: "Shoulder Press", muscle: "Shoulders", sets: "3 × 10–12", weight: "Moderate (20–35 lb each)", cue: "Seated or standing. Dumbbells at ear level, palms forward. Press straight overhead without shrugging. Lower slowly. Keep core tight if standing.", video: "https://www.youtube.com/watch?v=qEwKCR5JCog", videoLabel: "DB Shoulder Press — AthleanX" },
      { name: "Romanian Deadlift", muscle: "Legs", sets: "3 × 10–12", weight: "Moderate–Heavy (30–50 lb each)", cue: "Stand, dumbbells in front of thighs. Hinge at hips pushing them back, lowering weights along legs. Feel hamstring stretch, then drive hips forward to return. Back stays flat — not a squat.", video: "https://www.youtube.com/watch?v=JCXUYuzwNrM", videoLabel: "DB RDL — Jeff Nippard" },
      { name: "Plank", muscle: "Core", sets: "3 × 30–60 sec", weight: "Bodyweight", cue: "Forearms on floor, body in straight line head to heels. Squeeze glutes and abs, don't let hips sag or pike. Breathe steadily. Progress by adding time each week.", video: "https://www.youtube.com/watch?v=ASdvN_XEl_c", videoLabel: "Perfect Plank — AthleanX" },
    ],
  },
  {
    id: "B", title: "Workout B", subtitle: "Hinge · Push · Pull", color: BLUE,
    focus: "Hamstrings, Shoulders, Lats", duration: "35–45 min",
    exercises: [
      { name: "Dumbbell Deadlift", muscle: "Legs", sets: "3 × 8–10", weight: "Heavy (40–50 lb each)", cue: "Dumbbells at sides. Hinge and grip, back flat, chest up. Drive through floor — hips and shoulders rise together. Lock out at top. Lower with control; this is where you grow.", video: "https://www.youtube.com/watch?v=ytGaGIn3SjE", videoLabel: "DB Deadlift — Buff Dudes" },
      { name: "Arnold Press", muscle: "Shoulders", sets: "3 × 10–12", weight: "Light–Moderate (15–25 lb each)", cue: "Start with dumbbells at chin, palms facing you. As you press up, rotate palms forward. Reverse on the way down. Hits all three shoulder heads. Go lighter than you think.", video: "https://www.youtube.com/watch?v=6Z15_WdXmVw", videoLabel: "Arnold Press — ScottHermanFitness" },
      { name: "Chest Fly", muscle: "Chest", sets: "3 × 12–15", weight: "Light (15–25 lb each)", cue: "Lie on floor. Arms wide, slight bend in elbows. Arc dumbbells together over chest like hugging a barrel. Stretch at bottom, squeeze at top. Isolation movement — go light.", video: "https://www.youtube.com/watch?v=eozdVDA78K0", videoLabel: "DB Chest Fly — Renaissance Periodization" },
      { name: "Reverse Fly", muscle: "Back", sets: "3 × 12–15", weight: "Light (10–20 lb each)", cue: "Hinge forward at hips, arms hanging. Raise dumbbells out to sides like wings, squeezing shoulder blades at top. Keep slight bend in elbows. Very light weight — rear delts are small muscles.", video: "https://www.youtube.com/watch?v=ttvfGg9d76c", videoLabel: "DB Reverse Fly — Jeff Nippard" },
      { name: "Dumbbell Lunge", muscle: "Legs", sets: "3 × 10 each leg", weight: "Moderate (20–35 lb each)", cue: "Stand, dumbbells at sides. Step forward, lower back knee toward floor. Front knee stays over ankle. Push off front foot to return. Alternate legs or complete one side at a time.", video: "https://www.youtube.com/watch?v=QOVaHwm-Q6U", videoLabel: "DB Lunge — Howcast" },
      { name: "Dead Bug", muscle: "Core", sets: "3 × 8–10 each side", weight: "Bodyweight", cue: "Lie on back, arms straight up, knees bent 90° in air. Slowly lower opposite arm and leg toward floor while pressing lower back INTO the floor. Return and switch. Core stability, not a crunch.", video: "https://www.youtube.com/watch?v=g_BYB0R-4Ws", videoLabel: "Dead Bug — AthleanX" },
    ],
  },
  {
    id: "C", title: "Workout C", subtitle: "Split · Curl · Carry", color: PURPLE,
    focus: "Glutes, Arms, Total Body", duration: "35–45 min",
    exercises: [
      { name: "Bulgarian Split Squat", muscle: "Legs", sets: "3 × 8–10 each leg", weight: "Moderate (20–35 lb each)", cue: "Rear foot elevated on chair or couch. Front foot forward enough that shin stays vertical at bottom. Lower straight down. Brutal but excellent for glutes and quads. Go slow and controlled.", video: "https://www.youtube.com/watch?v=2C-uNgKwPLE", videoLabel: "Bulgarian Split Squat — Jeff Nippard" },
      { name: "Bicep Curl", muscle: "Arms", sets: "3 × 12–15", weight: "Moderate (20–30 lb each)", cue: "Stand, palms forward. Curl both dumbbells to shoulder height, squeezing at top. Lower slowly — the eccentric is as important as the lift. No swinging or momentum.", video: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo", videoLabel: "DB Bicep Curl — ScottHermanFitness" },
      { name: "Overhead Tricep Extension", muscle: "Arms", sets: "3 × 12–15", weight: "Moderate (25–40 lb one DB)", cue: "Hold one dumbbell with both hands overhead. Keep upper arms close to head, lower behind your head, then press back up. Elbows shouldn't flare. Hits the long head of triceps effectively.", video: "https://www.youtube.com/watch?v=_gsUck-7M74", videoLabel: "Overhead Tricep Ext — Renaissance Periodization" },
      { name: "Upright Row", muscle: "Shoulders", sets: "3 × 12", weight: "Light–Moderate (15–25 lb each)", cue: "Hold dumbbells in front of thighs. Pull up toward chin leading with elbows — elbows stay higher than wrists. Don't go above chin. Lower controlled. Hits traps and lateral delts.", video: "https://www.youtube.com/watch?v=Um3ZCH9OOUI", videoLabel: "DB Upright Row — ScottHermanFitness" },
      { name: "Hip Thrust", muscle: "Legs", sets: "3 × 12–15", weight: "Moderate–Heavy (35–50 lb)", cue: "Upper back on couch or bench, dumbbell on hips. Drive hips up until body is straight from shoulders to knees. Squeeze glutes hard at top. Lower slowly. Best glute exercise available with dumbbells.", video: "https://www.youtube.com/watch?v=SEdqd9BoBB0", videoLabel: "DB Hip Thrust — Bret Contreras" },
      { name: "Farmer's Carry", muscle: "Core", sets: "3 × 40 steps", weight: "Heavy (40–50 lb each)", cue: "Pick up heavy dumbbells, stand tall. Walk with purpose — shoulders back, core braced, don't lean. Turn at end of space and return. Simple but brutally effective for core, grip, and conditioning.", video: "https://www.youtube.com/watch?v=Fkzk_RqlYig", videoLabel: "Farmer's Carry — AthleanX" },
    ],
  },
];

const PLAN_EXERCISE = [
  { icon: "🏃", label: "Cardio", target: "2x / week", tag: "PRIORITY", detail: "20–35 min at Zone 2 pace — uncomfortable but conversational. Run, brisk walk, anything hitting 130–150 BPM. Primary lever for VO₂ max and healthspan." },
  { icon: "💪", label: "Strength", target: "1x / week", tag: "IMPORTANT", detail: "Rotate Workouts A → B → C. 35–45 min, dumbbells only. See the Workouts tab for full exercise details and video demos." },
  { icon: "🚶", label: "Daily Steps", target: "8,000+ on 4+ days/week", tag: "HABIT", detail: "Averaging ~7,600 recently — close. Park further, walk during calls, after-dinner walk with the kids all count toward this." },
];

const PLAN_DIET = [
  { icon: "🥗", label: "Protein at every meal", detail: "Aim for ~30–40g per meal. Eggs, Greek yogurt, chicken, cottage cheese, fish. Protein keeps you full longer — single best lever against snacking and portion creep." },
  { icon: "🌙", label: "Kitchen closes at 9pm", detail: "Late-night snacking is your stated weak point. A hard cutoff beats willpower in the moment. Brush teeth after dinner as a psychological cue." },
  { icon: "🍽️", label: "Plate method for portions", detail: "Half the plate vegetables, quarter protein, quarter carbs. No calorie counting needed. Works well for family dinners." },
  { icon: "💧", label: "Water before meals", detail: "16oz of water 15–20 min before eating reduces meal size naturally. Easy to confuse thirst for hunger." },
  { icon: "🚫", label: "Default swaps, not restrictions", detail: "Don't ban foods. Have a default swap ready: chips → nuts or apple with PB, second helpings → wait 10 min, soda → sparkling water." },
];

const HEALTHSPAN_METRICS = [
  { metric: "VO₂ Max", current: "35.8", unit: "mL/min·kg", goal: "38+", note: "Up from 33.7 in April — the running is working. Keep 2x/week and expect continued gains over 2–3 months.", dbField: "vo2_max", goalValue: 38, color: ACCENT },
  { metric: "Resting HR", current: "65", unit: "BPM", goal: "<60", note: "Holding steady. Will trend down as aerobic base builds.", dbField: "resting_hr", goalValue: 60, color: BLUE },
  { metric: "HRV", current: "54", unit: "ms", goal: "55+", note: "Nearly at goal. Watch for drops after poor sleep or high-stress weeks.", dbField: "hrv_ms", goalValue: 55, color: PURPLE },
  { metric: "Daily Steps", current: "~7,600", unit: "avg/week", goal: "8,000+", note: "Just under target. Small habit changes close the gap.", dbField: "total_daily_steps", goalValue: 8000, color: PINK },
  { metric: "Weight", current: "215.3", unit: "lbs", goal: "200", note: "15.3 lbs to goal. Log daily for best trend picture — normal daily variation is 1–3 lbs.", dbField: "weight_lbs", goalValue: 200, color: GOLD },
];

// ── UI primitives ──────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return <button onClick={onClick} style={{ background: active ? ACCENT : "transparent", color: active ? "#0f1117" : MUTED, border: "none", borderRadius: 6, padding: "6px 11px", fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.07em", transition: "all 0.2s", whiteSpace: "nowrap" }}>{label.toUpperCase()}</button>;
}
function Badge({ label }) {
  const c = TAG_COLORS[label] || { bg: CARD2, color: MUTED, border: BORDER };
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 4, fontSize: 10, fontWeight: 800, padding: "2px 7px", letterSpacing: "0.1em" }}>{label}</span>;
}
function SectionHead({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: MUTED, marginBottom: 12, marginTop: 4 }}>{children}</div>;
}
function Card({ children, style: s, onClick, highlight }) {
  return <div onClick={onClick} style={{ background: CARD, border: `1px solid ${highlight ? ACCENT + "55" : BORDER}`, borderRadius: 12, padding: 16, cursor: onClick ? "pointer" : "default", transition: "border 0.2s", ...s }}>{children}</div>;
}
function Ring({ pct, size = 70, stroke = 6, color = ACCENT, label, sublabel }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, dash = circ * Math.min(pct, 1), done = pct >= 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BORDER} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={done ? ACCENT : color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease" }} />
        <foreignObject x={0} y={0} width={size} height={size}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", transform: "rotate(90deg)", color: done ? ACCENT : TEXT, fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>{label}</div>
        </foreignObject>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, color: done ? ACCENT : MUTED }}>{sublabel}</div>
    </div>
  );
}
function Counter({ value, max, onUp, onDown }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
      <button onClick={onDown} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, width: 32, height: 32, cursor: "pointer", fontWeight: 700, fontSize: 18, fontFamily: "inherit" }}>−</button>
      <span style={{ color: TEXT, fontWeight: 800, fontSize: 18, minWidth: 24, textAlign: "center" }}>{value}</span>
      <button onClick={onUp} disabled={value >= max} style={{ background: value >= max ? "#1a2e1a" : CARD2, border: `1px solid ${BORDER}`, borderRadius: 6, color: value >= max ? ACCENT : TEXT, width: 32, height: 32, cursor: value >= max ? "default" : "pointer", fontWeight: 700, fontSize: 18, fontFamily: "inherit" }}>+</button>
      <span style={{ fontSize: 12, color: MUTED }}>/ {max}</span>
    </div>
  );
}
function MusclePill({ muscle }) {
  const color = MUSCLE_COLORS[muscle] || MUTED;
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "2px 9px" }}>{muscle}</span>;
}
function SvgTooltip({ x, y, lines, color, W }) {
  const bw = Math.max(80, lines[1].length * 7 + 28), bh = 38;
  let tx = x - bw / 2, ty = y - bh - 12;
  tx = Math.max(2, Math.min(tx, W - bw - 2));
  if (ty < 2) ty = y + 14;
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={tx} y={ty} width={bw} height={bh} rx={5} fill={CARD2} stroke={color} strokeWidth={1} opacity={0.97} />
      <text x={tx + bw / 2} y={ty + 13} textAnchor="middle" fill={MUTED} fontSize={9} fontFamily="inherit">{lines[0]}</text>
      <text x={tx + bw / 2} y={ty + 28} textAnchor="middle" fill={TEXT} fontSize={11} fontWeight={700} fontFamily="inherit">{lines[1]}</text>
    </g>
  );
}
function WeightChart({ entries }) {
  const [hovered, setHovered] = useState(null);
  if (entries.length < 2) return <div style={{ textAlign: "center", color: MUTED, fontSize: 13, padding: "28px 0" }}>Log at least 2 days to see your trend chart.</div>;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  const weights = sorted.map(e => e.weight);
  const minW = Math.min(...weights, WEIGHT_TARGET) - 3, maxW = Math.max(...weights) + 3;
  const W = 540, H = 150, P = { t: 10, r: 24, b: 28, l: 36 }, iW = W - P.l - P.r, iH = H - P.t - P.b;
  const xp = i => P.l + (i / Math.max(sorted.length - 1, 1)) * iW;
  const yp = w => P.t + iH - ((w - minW) / (maxW - minW)) * iH;
  const pts = sorted.map((e, i) => `${xp(i)},${yp(e.weight)}`).join(" ");
  const area = `M${xp(0)},${P.t + iH} ` + sorted.map((e, i) => `L${xp(i)},${yp(e.weight)}`).join(" ") + ` L${xp(sorted.length - 1)},${P.t + iH} Z`;
  const ty = yp(WEIGHT_TARGET);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible" }} onMouseLeave={() => setHovered(null)}>
      <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity="0.2" /><stop offset="100%" stopColor={ACCENT} stopOpacity="0.01" /></linearGradient></defs>
      {[0, 0.25, 0.5, 0.75, 1].map(f => { const w = minW + f * (maxW - minW), y = yp(w); return <g key={f}><line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke={BORDER} strokeWidth={1} /><text x={P.l - 5} y={y + 4} textAnchor="end" fill={MUTED} fontSize={9}>{Math.round(w)}</text></g>; })}
      <line x1={P.l} y1={ty} x2={W - P.r} y2={ty} stroke={GOLD} strokeWidth={1.5} strokeDasharray="6 4" />
      <text x={W - P.r + 3} y={ty + 4} fill={GOLD} fontSize={9} fontWeight={700}>200</text>
      <path d={area} fill="url(#wg)" />
      <polyline points={pts} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {sorted.map((e, i) => (
        <g key={e.date}>
          <circle cx={xp(i)} cy={yp(e.weight)} r={hovered?.date === e.date ? 5 : 3} fill={ACCENT} />
          <circle cx={xp(i)} cy={yp(e.weight)} r={10} fill="transparent" style={{ cursor: "crosshair" }} onMouseEnter={() => setHovered({ x: xp(i), y: yp(e.weight), date: e.date, value: e.weight })} />
          {(i === 0 || i === sorted.length - 1 || i % 7 === 0) && <text x={xp(i)} y={H - 4} textAnchor="middle" fill={hovered?.date === e.date ? ACCENT : MUTED} fontSize={8}>{dateLabelFromStr(e.date)}</text>}
        </g>
      ))}
      {hovered && <SvgTooltip x={hovered.x} y={hovered.y} lines={[dateLabelFromStr(hovered.date), `${hovered.value} lbs`]} color={ACCENT} W={W} />}
    </svg>
  );
}

function SparklineChart({ entries, goalValue, color = ACCENT, unit = "", xMin, xMax }) {
  const [hovered, setHovered] = useState(null);
  if (entries.length === 0) {
    return <div style={{ textAlign: "center", color: MUTED, fontSize: 12, padding: "18px 0" }}>No data recorded yet.</div>;
  }
  const W = 540, H = 110, P = { t: 10, r: 30, b: 24, l: 40 }, iW = W - P.l - P.r, iH = H - P.t - P.b;
  const vals = entries.map(e => e.value);
  const minV = Math.min(...vals, goalValue) - Math.max(...vals) * 0.03;
  const maxV = Math.max(...vals, goalValue) + Math.max(...vals) * 0.03;
  const toMs = d => new Date(d).getTime();
  const domainMin = toMs(xMin ?? entries[0].date);
  const domainMax = toMs(xMax ?? entries[entries.length - 1].date);
  const domainRange = domainMax - domainMin;
  const xp = date => P.l + (domainRange === 0 ? iW / 2 : (toMs(date) - domainMin) / domainRange * iW);
  const yp = v => P.t + iH - ((v - minV) / (maxV - minV)) * iH;
  const gy = yp(goalValue);
  const gradId = `sg-${unit.replace(/[^a-z]/gi, "")}`;
  const fmtVal = v => v >= 1000 ? v.toLocaleString() : (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible" }} onMouseLeave={() => setHovered(null)}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(f => {
        const v = minV + f * (maxV - minV), y = yp(v);
        return <g key={f}><line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke={BORDER} strokeWidth={1} /><text x={P.l - 5} y={y + 4} textAnchor="end" fill={MUTED} fontSize={9}>{Number.isInteger(v) ? Math.round(v) : v.toFixed(1)}</text></g>;
      })}
      <line x1={P.l} y1={gy} x2={W - P.r} y2={gy} stroke={GOLD} strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={W - P.r + 4} y={gy + 4} fill={GOLD} fontSize={9} fontWeight={700}>{goalValue >= 1000 ? (goalValue / 1000).toFixed(0) + "k" : goalValue}</text>
      {entries.length >= 2 && (
        <>
          <path d={`M${xp(entries[0].date)},${P.t + iH} ` + entries.map(e => `L${xp(e.date)},${yp(e.value)}`).join(" ") + ` L${xp(entries[entries.length - 1].date)},${P.t + iH} Z`} fill={`url(#${gradId})`} />
          <polyline points={entries.map(e => `${xp(e.date)},${yp(e.value)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
      {entries.map((e) => (
        <g key={e.date}>
          <circle cx={xp(e.date)} cy={yp(e.value)} r={hovered?.date === e.date ? 5.5 : 3.5} fill={color} />
          <circle cx={xp(e.date)} cy={yp(e.value)} r={10} fill="transparent" style={{ cursor: "crosshair" }} onMouseEnter={() => setHovered({ x: xp(e.date), y: yp(e.value), date: e.date, value: e.value })} />
        </g>
      ))}
      <text x={P.l} y={H - 2} textAnchor="start" fill={MUTED} fontSize={9}>{dateLabelFromStr(xMin ?? entries[0].date)}</text>
      {domainRange > 0 && <text x={W - P.r} y={H - 2} textAnchor="end" fill={MUTED} fontSize={9}>{dateLabelFromStr(xMax ?? entries[entries.length - 1].date)}</text>}
      {hovered && <SvgTooltip x={hovered.x} y={hovered.y} lines={[dateLabelFromStr(hovered.date), `${fmtVal(hovered.value)} ${unit}`]} color={color} W={W} />}
    </svg>
  );
}

// ── Workouts Tab ───────────────────────────────────────────────────────────
function WorkoutsTab() {
  const [activeWorkout, setActiveWorkout] = useState("A");
  const [expandedEx, setExpandedEx] = useState(null);
  const [lastDone, setLastDone] = useState({});

  useEffect(() => {
    DB.getLastWorkout().then(data => setLastDone(data || {}));
  }, []);

  const workout = WORKOUTS.find(w => w.id === activeWorkout);

  async function markDone(id) {
    const updated = { ...lastDone, [id]: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    setLastDone(updated);
    await DB.setLastWorkout(updated);
  }

  const nextSuggestion = (() => {
    const order = ["A", "B", "C"];
    const done = order.filter(id => lastDone[id]);
    if (!done.length) return "A";
    return order[(order.indexOf(done[done.length - 1]) + 1) % 3];
  })();

  return (
    <div>
      <div style={{ background: "#1a2233", border: `1px solid #1e3a5f`, borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: BLUE }}>
        <strong>Suggested next:</strong> Workout {nextSuggestion} — rotate A → B → C each session
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        {WORKOUTS.map(w => (
          <div key={w.id} onClick={() => setActiveWorkout(w.id)} style={{ background: activeWorkout === w.id ? w.color + "22" : CARD, border: `2px solid ${activeWorkout === w.id ? w.color : BORDER}`, borderRadius: 12, padding: "14px 10px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: w.color, marginBottom: 4 }}>{w.id}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: activeWorkout === w.id ? w.color : MUTED }}>{w.subtitle}</div>
            {lastDone[w.id] && <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>Last: {lastDone[w.id]}</div>}
          </div>
        ))}
      </div>
      <div style={{ background: workout.color + "18", border: `1px solid ${workout.color}44`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: workout.color }}>{workout.title}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>Focus: {workout.focus}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: MUTED }}>Duration</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{workout.duration}</div>
          </div>
        </div>
        <button onClick={() => markDone(workout.id)} style={{ marginTop: 12, background: workout.color, color: "#0f1117", border: "none", borderRadius: 7, padding: "8px 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em" }}>✓ Mark as Done Today</button>
      </div>
      <SectionHead>EXERCISES — {workout.exercises.length} MOVEMENTS</SectionHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {workout.exercises.map((ex, i) => {
          const key = `${activeWorkout}-${i}`, open = expandedEx === key;
          return (
            <div key={key} style={{ background: CARD, border: `1px solid ${open ? workout.color + "55" : BORDER}`, borderRadius: 12, overflow: "hidden", transition: "border 0.2s" }}>
              <div onClick={() => setExpandedEx(open ? null : key)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: workout.color + "22", color: workout.color, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{ex.name}</span>
                      <MusclePill muscle={ex.muscle} />
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{ex.sets} &nbsp;·&nbsp; {ex.weight}</div>
                  </div>
                </div>
                <span style={{ color: MUTED, fontSize: 20, flexShrink: 0 }}>{open ? "−" : "+"}</span>
              </div>
              {open && (
                <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ marginTop: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: MUTED, marginBottom: 6 }}>COACHING CUE</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}>{ex.cue}</div>
                  </div>
                  <div style={{ background: CARD2, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div><div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.1em" }}>SETS × REPS</div><div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginTop: 2 }}>{ex.sets}</div></div>
                      <div><div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.1em" }}>SUGGESTED WEIGHT</div><div style={{ fontSize: 14, fontWeight: 700, color: workout.color, marginTop: 2 }}>{ex.weight}</div></div>
                      <div><div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.1em" }}>REST</div><div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginTop: 2 }}>60–90 sec</div></div>
                    </div>
                  </div>
                  <a href={ex.video} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, background: "#1a1a2e", border: `1px solid #2a2a4a`, borderRadius: 8, padding: "10px 14px", textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                    <div style={{ background: "#ff0000", borderRadius: 6, width: 32, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" width={14} height={14} fill="white"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Watch on YouTube</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{ex.videoLabel}</div>
                    </div>
                    <div style={{ marginLeft: "auto", color: MUTED, fontSize: 12 }}>↗</div>
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 24 }}>
        <SectionHead>MUSCLE COVERAGE</SectionHead>
        <Card>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(MUSCLE_COLORS).map(([m, c]) => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                <span style={{ fontSize: 12, color: MUTED }}>{m}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 1.7 }}>Each workout hits all major muscle groups. Rotating A→B→C varies movement patterns, preventing adaptation and reducing injury risk.</div>
        </Card>
      </div>
    </div>
  );
}

// ── Targets Tab ────────────────────────────────────────────────────────────
function TargetsTab() {
  const [metricsHistory, setMetricsHistory] = useState([]);

  useEffect(() => {
    DB.getHealthMetrics().then(setMetricsHistory);
  }, []);

  const lastUpdated = metricsHistory.length > 0
    ? dateLabelFromStr(metricsHistory[metricsHistory.length - 1].recorded_at)
    : null;
  const xMin = metricsHistory.length > 0 ? metricsHistory[0].recorded_at : null;
  const xMax = metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1].recorded_at : null;

  return (
    <>
      <SectionHead>HEALTHSPAN METRICS</SectionHead>
      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, marginBottom: 16 }}>Numbers that predict long-term health.{lastUpdated ? ` Last updated ${lastUpdated}.` : ""}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {HEALTHSPAN_METRICS.map((h, i) => {
          const entries = metricsHistory
            .filter(r => r[h.dbField] != null)
            .map(r => ({ date: r.recorded_at, value: parseFloat(r[h.dbField]) }));
          return (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{h.metric}</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>NOW → GOAL</div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}><span style={{ color: DANGER }}>{h.current}</span><span style={{ color: MUTED, margin: "0 6px" }}>→</span><span style={{ color: ACCENT }}>{h.goal}</span><span style={{ color: MUTED, fontSize: 11, marginLeft: 4 }}>{h.unit}</span></div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.65, marginBottom: 14 }}>{h.note}</div>
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, overflowX: "auto" }}>
                <SparklineChart entries={entries} goalValue={h.goalValue} color={h.color} unit={h.unit} xMin={xMin} xMax={xMax} />
              </div>
            </Card>
          );
        })}
      </div>
      <SectionHead>THE BIG PICTURE</SectionHead>
      <Card>
        {[["Cardio fitness (VO₂ max)", "is the single strongest predictor of all-cause mortality. Yours jumped from 33.7 → 35.8 this month — the runs are working."], ["Muscle mass", "matters more after 40 than most people realize. Even 1x/week strength work maintains it. The A/B/C rotation is designed to be sustainable."], ["Consistent movement", "— not heroic workouts — is what accumulates over decades. 3 solid days/week for 10 years beats 6 months of intensity followed by burnout."], ["Sleep", "is the silent lever. Weight, HRV, energy, food choices — everything degrades with poor sleep. Non-negotiable with three kids."]].map(([title, body], i, arr) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < arr.length - 1 ? 16 : 0 }}>
            <div style={{ color: ACCENT, fontWeight: 800, marginTop: 1, flexShrink: 0 }}>→</div>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}><span style={{ color: TEXT, fontWeight: 700 }}>{title} </span>{body}</div>
          </div>
        ))}
      </Card>
    </>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function HealthCoach() {
  const [tab, setTab] = useState("tracker");
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(defaultWeek());
  const [weekHistory, setWeekHistory] = useState([]);
  const [weightEntries, setWeightEntries] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [histOpen, setHistOpen] = useState(null);
  const [toast, setToast] = useState("");
  const [saveTimer, setSaveTimer] = useState(null);

  const CW_KEY = currentWeekKey();

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  // ── Load on mount ──
  useEffect(() => {
    async function load() {
      try {
        // Current week
        const cw = await DB.getWeek(CW_KEY);
        setCurrentWeek(cw ? { cardio: cw.cardio, strength: cw.strength, steps: cw.steps, notes: cw.notes || "" } : defaultWeek());

        // All weeks for history (exclude current and meta)
        const all = await DB.getAllWeeks();
        const hist = all.filter(r => r.week_key !== CW_KEY && r.week_key !== "__workout_meta__");
        setWeekHistory(hist);

        // Weight entries
        const weights = await DB.getWeights();
        setWeightEntries(weights.map(r => ({ date: r.entry_date, weight: parseFloat(r.weight_lbs) })));
      } catch (e) {
        console.error("Load error:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── Auto-save current week with debounce ──
  useEffect(() => {
    if (loading) return;
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(() => {
      DB.upsertWeek(CW_KEY, {
        cardio: currentWeek.cardio,
        strength: currentWeek.strength,
        steps: currentWeek.steps,
        notes: currentWeek.notes,
      });
    }, 800);
    setSaveTimer(t);
  }, [currentWeek, loading]);

  function bump(field, delta) {
    setCurrentWeek(w => ({ ...w, [field]: Math.max(0, Math.min(w[field] + delta, WEEK_TARGETS[field])) }));
  }

  async function archiveWeek() {
    const saved = { cardio: currentWeek.cardio, strength: currentWeek.strength, steps: currentWeek.steps, notes: currentWeek.notes, saved_at: new Date().toISOString() };
    await DB.upsertWeek(CW_KEY, saved);
    setWeekHistory(h => [{ week_key: CW_KEY, ...saved }, ...h.filter(x => x.week_key !== CW_KEY)]);
    setCurrentWeek(defaultWeek());
    flash("✓ Week archived");
  }

  async function logWeight() {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val < 100 || val > 400) { flash("Enter a valid weight (lbs)"); return; }
    const today = todayDateStr();
    await DB.upsertWeight(today, val);
    setWeightEntries(prev => [...prev.filter(e => e.date !== today), { date: today, weight: val }].sort((a, b) => a.date.localeCompare(b.date)));
    setWeightInput("");
    flash("✓ Weight logged");
  }

  const cP = currentWeek.cardio / WEEK_TARGETS.cardio;
  const sP = currentWeek.strength / WEEK_TARGETS.strength;
  const stP = currentWeek.steps / WEEK_TARGETS.steps;
  const weekScore = Math.round(((cP + sP + stP) / 3) * 100);
  const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : 215.3;
  const todayLogged = weightEntries.some(e => e.date === todayDateStr());

  const TABS = ["tracker", "weight", "workouts", "history", "plan", "targets"];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontFamily: "system-ui", fontSize: 14, letterSpacing: "0.1em" }}>LOADING…</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'DM Sans','IBM Plex Sans',system-ui,sans-serif", paddingBottom: 60 }}>
      {toast && <div style={{ position: "fixed", top: 16, right: 16, background: CARD, border: `1px solid ${ACCENT}55`, borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, color: ACCENT, zIndex: 999 }}>{toast}</div>}

      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "20px 20px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: ACCENT, marginBottom: 4 }}>HEALTHSPAN COACH</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>Justin's Dashboard</div>
              <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>35–39 · Home workouts · 3 days/week</div>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.1em", marginBottom: 2 }}>WEEK</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: weekScore === 100 ? ACCENT : TEXT }}>{weekScore}<span style={{ fontSize: 13, color: MUTED }}>%</span></div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.1em", marginBottom: 2 }}>WEIGHT</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{latestWeight}<span style={{ fontSize: 13, color: MUTED }}>lb</span></div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 2 }}>
            {TABS.map(t => <Tab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />)}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 20px" }}>

        {tab === "tracker" && <>
          <SectionHead>THIS WEEK — {weekLabel(CW_KEY).toUpperCase()}</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[{ label: "Cardio", f: "cardio", emoji: "🏃", pct: cP, val: currentWeek.cardio, color: PINK }, { label: "Strength", f: "strength", emoji: "💪", pct: sP, val: currentWeek.strength, color: PURPLE }, { label: "8k+ Days", f: "steps", emoji: "🚶", pct: stP, val: currentWeek.steps, color: BLUE }].map(c => (
              <Card key={c.f} style={{ textAlign: "center", padding: "16px 10px" }}>
                <Ring pct={c.pct} color={c.color} label={`${c.val}/${WEEK_TARGETS[c.f]}`} sublabel={`${c.emoji} ${c.label}`} />
                <Counter value={c.val} max={WEEK_TARGETS[c.f]} onUp={() => bump(c.f, 1)} onDown={() => bump(c.f, -1)} />
              </Card>
            ))}
          </div>
          <SectionHead>WEEK NOTES</SectionHead>
          <Card style={{ marginBottom: 20 }}>
            <textarea value={currentWeek.notes} onChange={e => setCurrentWeek(w => ({ ...w, notes: e.target.value }))} placeholder="How did the week feel? Any wins, struggles, or things to remember…" rows={3} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: TEXT, fontFamily: "inherit", fontSize: 14, resize: "none", lineHeight: 1.65, boxSizing: "border-box" }} />
          </Card>
          <button onClick={archiveWeek} style={{ background: ACCENT, color: "#0f1117", border: "none", borderRadius: 8, padding: "12px 20px", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer", width: "100%", letterSpacing: "0.04em", marginBottom: 16 }}>Archive Week &amp; Start Fresh</button>
          <Card>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: MUTED, marginBottom: 10 }}>SYNCING FROM APPLE HEALTH</div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.75 }}>Tell Claude <span style={{ color: TEXT, fontStyle: "italic" }}>"update my activity"</span> any time and Claude will update the counters and weight based on Apple Health data.</div>
          </Card>
        </>}

        {tab === "weight" && <>
          <SectionHead>LOG TODAY'S WEIGHT</SectionHead>
          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="number" step="0.1" min="100" max="400" value={weightInput} onChange={e => setWeightInput(e.target.value)} onKeyDown={e => e.key === "Enter" && logWeight()} placeholder={todayLogged ? "Update today's entry" : "e.g. 215.0"} style={{ flex: 1, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontFamily: "inherit", fontSize: 16, fontWeight: 700, padding: "12px 14px", outline: "none" }} />
              <span style={{ color: MUTED, fontSize: 14, fontWeight: 700 }}>lbs</span>
              <button onClick={logWeight} style={{ background: ACCENT, color: "#0f1117", border: "none", borderRadius: 8, padding: "12px 18px", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>LOG</button>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 24 }}>
              {[["CURRENT", latestWeight + " lbs", TEXT], ["TARGET", WEIGHT_TARGET + " lbs", GOLD], ["TO GO", (latestWeight - WEIGHT_TARGET).toFixed(1) + " lbs", DANGER]].map(([lbl, val, col]) => (
                <div key={lbl}><div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.1em" }}>{lbl}</div><div style={{ fontSize: 20, fontWeight: 800, color: col, marginTop: 2 }}>{val}</div></div>
              ))}
            </div>
          </Card>
          <SectionHead>TREND</SectionHead>
          <Card style={{ marginBottom: 20, overflowX: "auto" }}><WeightChart entries={weightEntries} /></Card>
          <SectionHead>RECENT ENTRIES</SectionHead>
          <Card>{weightEntries.length === 0 ? <div style={{ color: MUTED, fontSize: 13 }}>No weight logged yet.</div> : [...weightEntries].reverse().slice(0, 14).map(e => (
            <div key={e.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: MUTED, fontSize: 13 }}>{dateLabelFromStr(e.date)}</span>
              <span style={{ color: TEXT, fontWeight: 700 }}>{e.weight} lbs</span>
            </div>
          ))}</Card>
        </>}

        {tab === "workouts" && <WorkoutsTab />}

        {tab === "history" && <>
          <SectionHead>ARCHIVED WEEKS</SectionHead>
          {weekHistory.length === 0
            ? <Card><div style={{ color: MUTED, fontSize: 13, lineHeight: 1.7 }}>No weeks archived yet. Complete a week on the Tracker tab and hit "Archive Week" to save it here.</div></Card>
            : weekHistory.map(w => {
              const score = Math.round((Math.min(w.cardio, WEEK_TARGETS.cardio) / WEEK_TARGETS.cardio + Math.min(w.strength, WEEK_TARGETS.strength) / WEEK_TARGETS.strength + Math.min(w.steps, WEEK_TARGETS.steps) / WEEK_TARGETS.steps) / 3 * 100);
              const open = histOpen === w.week_key;
              return (
                <Card key={w.week_key} onClick={() => setHistOpen(open ? null : w.week_key)} highlight={open} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{weekLabel(w.week_key)}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>🏃 {w.cardio}/{WEEK_TARGETS.cardio} &nbsp;·&nbsp; 💪 {w.strength}/{WEEK_TARGETS.strength} &nbsp;·&nbsp; 🚶 {w.steps}/{WEEK_TARGETS.steps}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: score >= 80 ? ACCENT : score >= 50 ? GOLD : DANGER }}>{score}%</div>
                      <span style={{ color: MUTED, fontSize: 18 }}>{open ? "−" : "+"}</span>
                    </div>
                  </div>
                  {open && <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`, fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>{w.notes || <span style={{ color: MUTED }}>No notes for this week.</span>}</div>}
                </Card>
              );
            })
          }
        </>}

        {tab === "plan" && <>
          <SectionHead>EXERCISE TARGETS</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {PLAN_EXERCISE.map((e, i) => { const k = `ex${i}`; return (
              <Card key={i} onClick={() => setExpanded(expanded === k ? null : k)} highlight={expanded === k}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{e.icon}</span>
                    <div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, fontSize: 15 }}>{e.label}</span><Badge label={e.tag} /></div><div style={{ color: ACCENT, fontSize: 12, fontWeight: 700, marginTop: 2 }}>{e.target}</div></div>
                  </div>
                  <span style={{ color: MUTED, fontSize: 20 }}>{expanded === k ? "−" : "+"}</span>
                </div>
                {expanded === k && <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}>{e.detail}</div>}
              </Card>
            ); })}
          </div>
          <SectionHead>NUTRITION PRINCIPLES</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PLAN_DIET.map((d, i) => { const k = `diet${i}`; return (
              <Card key={i} onClick={() => setExpanded(expanded === k ? null : k)} highlight={expanded === k}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 22 }}>{d.icon}</span><span style={{ fontWeight: 700, fontSize: 15 }}>{d.label}</span></div>
                  <span style={{ color: MUTED, fontSize: 20 }}>{expanded === k ? "−" : "+"}</span>
                </div>
                {expanded === k && <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, fontSize: 13, color: "#94a3b8", lineHeight: 1.75 }}>{d.detail}</div>}
              </Card>
            ); })}
          </div>
        </>}

        {tab === "targets" && <TargetsTab />}

      </div>
    </div>
  );
}
