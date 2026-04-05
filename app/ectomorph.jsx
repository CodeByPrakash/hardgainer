"use client";
import { useState, useEffect, useRef } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Barlow+Condensed:wght@500;600;700;800&display=swap');`;

// ─── Calculation Engine ───────────────────────────────────────────────────────
function calcPlan(u) {
  const { weight, height, age, targetGain, months, gymHours } = u;
  const bmi = weight / ((height / 100) ** 2);

  // BMR (Mifflin-St Jeor, male assumed for ecto bulk)
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;

  // Activity multiplier based on gym hours/day
  const actMult = gymHours <= 1 ? 1.55 : gymHours <= 1.5 ? 1.65 : gymHours <= 2 ? 1.725 : 1.9;
  const tdee = Math.round(bmr * actMult);

  // Ectomorph bulk surplus: 500–700 kcal above TDEE
  const surplus = gymHours >= 1.5 ? 700 : 500;
  const dailyCalories = tdee + surplus;

  // Macros: 40C / 30P / 30F
  const protein = Math.round((dailyCalories * 0.30) / 4);
  const carbs = Math.round((dailyCalories * 0.40) / 4);
  const fats = Math.round((dailyCalories * 0.30) / 9);

  // Per-meal breakdown (6 meals)
  const mealDist = [0.10, 0.18, 0.12, 0.22, 0.14, 0.17, 0.07];
  const mealCals = mealDist.map(p => Math.round(dailyCalories * p));

  // Protein per kg target
  const protPerKg = (protein / weight).toFixed(1);

  // Weekly gain target
  const gainPerWeek = ((targetGain / months) / 4.33).toFixed(2);
  const gainPerMonth = (targetGain / months).toFixed(1);

  // Sets & volume based on gym hours
  const setsBase = gymHours < 1 ? 3 : gymHours <= 1.5 ? 4 : 5;

  // Supplement budget estimate (INR)
  const creatineCost = 600;
  const wheyCostMonth = Math.round((protein * 30 * 0.4) / 25) * 120; // rough
  const totalSuppBudget = Math.round(creatineCost + Math.min(wheyCostMonth, 2500));

  // Hydration target
  const water = Math.round(weight * 0.045 * 10) / 10;

  // Sleep recommendation
  const sleep = gymHours >= 1.5 ? 9 : 8;

  return {
    bmi: bmi.toFixed(1), bmr: Math.round(bmr), tdee, dailyCalories,
    protein, carbs, fats, protPerKg,
    mealCals, gainPerWeek, gainPerMonth,
    setsBase, totalSuppBudget, water, sleep,
    surplus, actMult
  };
}

// ─── Meal Data Generator ─────────────────────────────────────────────────────
function getMeals(mealCals, weight) {
  const eggs = Math.max(3, Math.round(weight / 18));
  const roti = Math.max(3, Math.round(mealCals[3] / 80));
  const rice = Math.max(1, Math.round(mealCals[3] / 200)).toFixed(0);

  return [
    {
      time: "6:30 AM", tag: "WAKE UP", name: "Pre-Breakfast", badge: "🌅 EASY",
      items: `${Math.max(4, eggs - 1)} soaked almonds + 2 walnuts + 1 banana + 1 glass full-fat milk with 2 tsp honey`, cal: mealCals[0]
    },
    {
      time: "8:30 AM", tag: "BREAKFAST", name: "Power Breakfast", badge: "🍳 CANTEEN",
      items: `${eggs} egg omelette + ${Math.max(3, roti - 1)} slices bread / rotis + 1 glass milk`, cal: mealCals[1]
    },
    {
      time: "11:00 AM", tag: "MID MEAL", name: "Calorie Bridge", badge: "⚡ EASY",
      items: `1 cup boiled chana + 1 banana + ${Math.round(weight / 10) * 5}g peanuts or 2 tbsp peanut butter`, cal: mealCals[2]
    },
    {
      time: "1:30 PM", tag: "LUNCH", name: "Heavy Lunch", badge: "🏠 MESS",
      items: `${roti} rotis / ${rice} cup rice + dal (double) + chicken/paneer + sabzi + curd`, cal: mealCals[3]
    },
    {
      time: "4:30 PM", tag: "PRE-GYM", name: "Pre-Workout Fuel", badge: "💪 45 MIN BEFORE",
      items: `2 bananas + 4 bread slices with peanut butter + 1 glass milk`, cal: mealCals[4]
    },
    {
      time: "8:00 PM", tag: "POST-GYM", name: "Recovery Meal", badge: "🔄 WITHIN 30 MIN",
      items: `Whey protein shake OR ${Math.min(eggs, 4)} boiled eggs + 1 cup rice + chicken/paneer + dal`, cal: mealCals[5]
    },
    {
      time: "10:30 PM", tag: "BED TIME", name: "Night Muscle Fuel", badge: "🌙 EASY",
      items: `1 cup full-fat milk + 2 tbsp peanut butter / ${Math.round(weight / 15) * 5}g peanuts`, cal: mealCals[6]
    },
  ];
}

// ─── Workout Generator ───────────────────────────────────────────────────────
function getWorkout(setsBase, gymHours) {
  const s = setsBase;
  const extra = gymHours >= 2;
  return [
    {
      day: "Monday", focus: "Chest + Triceps", color: "#FF4D00",
      exercises: [
        { name: "Barbell Bench Press", sets: s, reps: "6–8" },
        { name: "Incline Dumbbell Press", sets: s, reps: "8–10" },
        { name: extra ? "Cable Fly + Chest Dip" : "Cable Fly", sets: s - 1, reps: "10–12" },
        { name: "Close Grip Bench Press", sets: s - 1, reps: "8–10" },
        { name: "Tricep Pushdown + OH Ext.", sets: s - 1, reps: "10–12" },
        ...(extra ? [{ name: "Dips (Weighted)", sets: 3, reps: "8–10" }] : [])
      ]
    },
    {
      day: "Tuesday", focus: "Back + Biceps", color: "#3498DB",
      exercises: [
        { name: "Deadlift", sets: s, reps: "5–6" },
        { name: "Pull-Ups / Lat Pulldown", sets: s, reps: "8–10" },
        { name: "Barbell Bent-Over Row", sets: s, reps: "8" },
        { name: "Seated Cable Row", sets: s - 1, reps: "10–12" },
        { name: "Barbell Curl + Hammer Curl", sets: s - 1, reps: "10–12" },
        ...(extra ? [{ name: "Face Pulls", sets: 3, reps: "15" }] : [])
      ]
    },
    {
      day: "Wednesday", focus: "Legs + Glutes", color: "#9B59B6",
      exercises: [
        { name: "Barbell Back Squat", sets: s + 1, reps: "5–6" },
        { name: "Leg Press", sets: s, reps: "10" },
        { name: "Romanian Deadlift", sets: s - 1, reps: "10" },
        { name: "Leg Curl + Leg Extension", sets: s - 1, reps: "12" },
        { name: "Standing Calf Raises", sets: s, reps: "15–20" },
        ...(extra ? [{ name: "Bulgarian Split Squat", sets: 3, reps: "10" }] : [])
      ]
    },
    {
      day: "Thursday", focus: "Shoulders + Traps", color: "#FFB800",
      exercises: [
        { name: "Overhead Press (Barbell)", sets: s, reps: "6–8" },
        { name: "Arnold Press (Dumbbell)", sets: s - 1, reps: "10" },
        { name: "Lateral Raises", sets: s, reps: "12–15" },
        { name: "Front + Rear Delt Fly", sets: s - 1, reps: "12" },
        { name: "Barbell Shrugs", sets: s, reps: "12–15" },
        ...(extra ? [{ name: "Upright Row", sets: 3, reps: "12" }] : [])
      ]
    },
    {
      day: "Friday", focus: "Arms + Core", color: "#2ECC71",
      exercises: [
        { name: "EZ Bar Curl", sets: s, reps: "8–10" },
        { name: "Hammer + Concentration Curl", sets: s - 1, reps: "10–12" },
        { name: "Skull Crushers", sets: s, reps: "8–10" },
        { name: "Rope Pushdown + Dips", sets: s - 1, reps: "10–12" },
        { name: "Plank + Hanging Leg Raise", sets: 3, reps: "30–60s" },
        ...(extra ? [{ name: "Cable Crunch", sets: 3, reps: "15" }] : [])
      ]
    },
  ];
}

// ─── Timeline Generator ──────────────────────────────────────────────────────
function getTimeline(targetGain, months) {
  const perMonth = targetGain / months;
  const phases = [];
  const labels = ["Foundation", "Activation", "Visual Change", "Strength Peak", "Transformation", "Target Zone", "Beyond"];
  const descs = [
    "Body adapts to training and calorie surplus. Build habits. Mostly water + glycogen.",
    "Strength shoots up fast. Neuromuscular efficiency peaks. First real muscle tissue.",
    "People around you notice. Shoulders wider, chest thicker. Ride this momentum!",
    "Your lifts are significantly heavier. Start 1 light cardio/week. Keep overloading.",
    "Full body transformation visible. V-taper forming. Push through the plateau with diet.",
    "Target achieved! Decide: continue lean bulk OR enter mini-cut to reveal muscle.",
    "Advanced phase. Consider periodization and deload weeks."
  ];
  for (let i = 0; i < months; i++) {
    const gain = i === 0 ? Math.min(perMonth * 0.7, 2) : perMonth;
    phases.push({ month: i + 1, label: labels[Math.min(i, 6)], gain: gain.toFixed(1), desc: descs[Math.min(i, 6)] });
  }
  return phases;
}

// ─── Supplement Recommendations ──────────────────────────────────────────────
function getSupps(dailyCalories, protein, gymHours) {
  const creatineDose = "5g";
  const wheyScoop = Math.ceil((protein * 0.4) / 25);
  return [
    {
      emoji: "🥛", name: "Whey Protein", priority: "#1 Priority",
      when: `${wheyScoop} scoop${wheyScoop > 1 ? "s" : ""}/day — Post-workout + Morning`,
      note: `Target ${protein}g protein/day. MuscleBlaze Beginner's Whey ~₹1,200/kg. ${wheyScoop} scoop${wheyScoop > 1 ? "s" : ""} covers ${Math.round(wheyScoop * 25)}g.`
    },
    {
      emoji: "💪", name: "Creatine Monohydrate", priority: "#2 Priority",
      when: `${creatineDose} daily, post-workout with water`,
      note: "Best proven supplement. +5–15% strength. ~₹500–700 for 3 months supply."
    },
    {
      emoji: "☀️", name: "Vitamin D3 + K2", priority: "#3 Priority",
      when: "Morning with a fatty meal",
      note: "2000–4000 IU/day. 70% of Indians deficient. Boosts testosterone → more muscle."
    },
    {
      emoji: "🌙", name: "Magnesium Glycinate", priority: "Optional",
      when: "Before bed — 200–400mg",
      note: `Better sleep quality = better recovery. You need ${gymHours >= 1.5 ? "9" : "8"} hrs — magnesium helps hit that.`
    },
  ];
}

// ─── UI Components ───────────────────────────────────────────────────────────
const css = {
  fire: "#FF4D00", gold: "#FFB800", dark: "#080808", card: "#111", card2: "#161616",
  border: "#1e1e1e", text: "#E8E8E8", muted: "#666", green: "#2ECC71", blue: "#3498DB",
};

function Tag({ children, color = "#FF4D00" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: `${color}18`, border: `1px solid ${color}35`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11,
      fontWeight: 700, color, letterSpacing: "0.8px", fontFamily: "'Barlow Condensed',sans-serif"
    }}>{children}</span>
  );
}

function SectionHeader({ icon, title, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
      <div style={{
        width: 46, height: 46, background: `${css.fire}18`, border: `1px solid ${css.fire}35`,
        borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0
      }}>{icon}</div>
      <div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: "#fff", letterSpacing: 1 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: css.muted, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>{sub}</div>}
      </div>
    </div>
  );
}

function NumInput({ label, value, onChange, min, max, step = 1, unit = "" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", color: css.muted, textTransform: "uppercase" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: "100%", background: css.card2, border: `1px solid ${css.border}`,
            borderRadius: 8, padding: "12px 40px 12px 14px",
            fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: "#fff",
            outline: "none", transition: "border-color 0.2s",
            WebkitAppearance: "none", MozAppearance: "textfield"
          }}
          onFocus={e => e.target.style.borderColor = css.fire}
          onBlur={e => e.target.style.borderColor = css.border}
        />
        {unit && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: css.muted, fontWeight: 700 }}>{unit}</span>}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("form"); // "form" | "plan"
  const [animIn, setAnimIn] = useState(false);
  const [activeTab, setActiveTab] = useState("diet");
  const planRef = useRef(null);

  const [user, setUser] = useState({
    weight: 58, height: 172, age: 20,
    targetGain: 15, months: 6, gymHours: 1.5
  });

  const plan = calcPlan(user);
  const meals = getMeals(plan.mealCals, user.weight);
  const workout = getWorkout(plan.setsBase, user.gymHours);
  const timeline = getTimeline(user.targetGain, user.months);
  const supps = getSupps(plan.dailyCalories, plan.protein, user.gymHours);

  const set = (k) => (v) => setUser(p => ({ ...p, [k]: v }));

  function generate() {
    setStep("plan");
    setTimeout(() => {
      setAnimIn(true);
      planRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }

  const tabs = [
    { id: "diet", icon: "🔥", label: "Calories" },
    { id: "meals", icon: "🍛", label: "Meal Plan" },
    { id: "gym", icon: "💪", label: "Workout" },
    { id: "timeline", icon: "📅", label: "Timeline" },
    { id: "supps", icon: "💊", label: "Supplements" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#141414ff", minHeight: "100vh", color: css.text }}>
      <style>{FONTS}{`
        *{box-sizing:border-box;margin:0;padding:0;}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        input[type=number]{-moz-appearance:textfield;}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:#111;}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .animated{animation:fadeUp 0.5s ease forwards;}
        .tab-btn:hover{border-color:${css.fire}!important;color:#fff!important;}
      `}</style>

      {/* ── HERO ── */}
      <div style={{
        background: "linear-gradient(135deg,#0A0A0A,#180800,#0A0A0A)",
        padding: "56px 20px 48px", textAlign: "center", position: "relative",
        borderBottom: `1px solid #1a0800`, overflow: "hidden"
      }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%,rgba(255,77,0,0.15) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 4, color: css.fire, marginBottom: 14, border: `1px solid ${css.fire}40`, display: "inline-block", padding: "4px 14px", borderRadius: 2 }}>
          ECTOMORPH DYNAMIC BULK SYSTEM
        </div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(52px,12vw,90px)", color: "#fff", lineHeight: 0.95, letterSpacing: 2 }}>
          HARD<span style={{ color: css.fire }}>GAINER</span>
        </div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(28px,6vw,52px)", color: "#fff", letterSpacing: 2, marginBottom: 18 }}>
          PROTOCOL <span style={{ color: css.gold }}>v2.0</span>
        </div>
        <p style={{ color: css.muted, fontSize: 14, maxWidth: 480, margin: "0 auto" }}>
          Enter your stats below — every calorie, meal, set, and supplement recommendation updates dynamically just for you.
        </p>
      </div>

      {/* ── INPUT FORM ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ background: css.card, border: `1px solid ${css.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "22px 24px", borderBottom: `1px solid ${css.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: css.fire, animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 1, color: "#fff" }}>YOUR PERSONAL STATS</span>
            <span style={{ fontSize: 12, color: css.muted, marginLeft: "auto" }}>All fields auto-calculate your plan</span>
          </div>

          <div style={{ padding: "28px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16, marginBottom: 24 }}>
              <NumInput label="Body Weight" value={user.weight} onChange={set("weight")} min={40} max={120} unit="kg" />
              <NumInput label="Height" value={user.height} onChange={set("height")} min={140} max={220} unit="cm" />
              <NumInput label="Age" value={user.age} onChange={set("age")} min={15} max={50} unit="yrs" />
              <NumInput label="Target Gain" value={user.targetGain} onChange={set("targetGain")} min={3} max={40} unit="kg" />
              <NumInput label="Timeframe" value={user.months} onChange={set("months")} min={2} max={18} unit="mo" />
              <NumInput label="Gym Hours/Day" value={user.gymHours} onChange={set("gymHours")} min={0.5} max={3} step={0.25} unit="hr" />
            </div>

            {/* Live preview chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              <Tag color={css.fire}>BMI: {plan.bmi}</Tag>
              <Tag color={css.gold}>{plan.dailyCalories} kcal/day</Tag>
              <Tag color={css.green}>{plan.protein}g protein</Tag>
              <Tag color={css.blue}>{plan.gainPerMonth} kg/month</Tag>
              <Tag color="#9B59B6">{plan.water}L water</Tag>
              <Tag color="#E74C3C">Sleep {plan.sleep}h</Tag>
            </div>

            <button onClick={generate} style={{
              width: "100%", padding: "16px", background: `linear-gradient(135deg,${css.fire},#cc3800)`,
              border: "none", borderRadius: 10, fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 22, letterSpacing: 2, color: "#fff", cursor: "pointer",
              transition: "transform 0.15s,box-shadow 0.15s",
              boxShadow: `0 4px 24px ${css.fire}40`
            }}
              onMouseEnter={e => { e.target.style.transform = "scale(1.01)"; e.target.style.boxShadow = `0 8px 32px ${css.fire}60` }}
              onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = `0 4px 24px ${css.fire}40` }}
            >
              ⚡ GENERATE MY PERSONALIZED PLAN
            </button>
          </div>
        </div>
      </div>

      {/* ── PLAN OUTPUT ── */}
      {step === "plan" && (
        <div ref={planRef} style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px 60px" }}>

          {/* Stats bar */}
          <div className={animIn ? "animated" : ""} style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            background: css.card, border: `1px solid ${css.border}`, borderRadius: 12,
            marginBottom: 24, overflow: "hidden", animationDelay: "0s"
          }}>
            {[
              { val: `${plan.dailyCalories}`, unit: "kcal", label: "Daily Target" },
              { val: `${plan.protein}g`, unit: "", label: "Protein/Day" },
              { val: `+${plan.gainPerMonth}kg`, unit: "", label: "Per Month" },
              { val: `${user.months}mo`, unit: "", label: "Duration" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "20px 12px", textAlign: "center", borderRight: i < 3 ? `1px solid ${css.border}` : "none" }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: css.fire, lineHeight: 1 }}>{s.val}<span style={{ fontSize: 16 }}>{s.unit}</span></div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", color: css.muted, textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className={animIn ? "animated" : ""} style={{
            display: "flex", gap: 8, marginBottom: 20, overflowX: "auto",
            paddingBottom: 4, animationDelay: "0.08s"
          }}>
            {tabs.map(t => (
              <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id)} style={{
                padding: "10px 18px", borderRadius: 8, border: `1px solid`,
                borderColor: activeTab === t.id ? css.fire : css.border,
                background: activeTab === t.id ? `${css.fire}18` : "transparent",
                color: activeTab === t.id ? css.fire : css.muted,
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700,
                letterSpacing: 1, cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.18s"
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: DIET ── */}
          {activeTab === "diet" && (
            <div className={animIn ? "animated" : ""} style={{ animationDelay: "0.12s" }}>
              <div style={{ background: `linear-gradient(135deg,#1a0800,#110500)`, border: `1px solid ${css.fire}40`, borderRadius: 12, padding: "28px 24px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -20, top: 10, fontFamily: "'Bebas Neue',sans-serif", fontSize: 80, color: `${css.fire}06`, pointerEvents: "none", whiteSpace: "nowrap" }}>CALORIES</div>
                <div style={{ fontSize: 11, color: css.muted, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>Your Daily Calorie Goal</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 72, color: css.fire, lineHeight: 1 }}>
                  {plan.dailyCalories.toLocaleString()} <span style={{ fontSize: 22, color: css.gold }}>kcal</span>
                </div>
                <div style={{ fontSize: 13, color: css.muted, marginTop: 10 }}>
                  TDEE: <strong style={{ color: "#aaa" }}>{plan.tdee} kcal</strong> &nbsp;+&nbsp; Surplus: <strong style={{ color: css.fire }}>{plan.surplus} kcal</strong>
                  &nbsp;·&nbsp; Protein {plan.protPerKg}g/kg body weight
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 20 }}>
                  {[
                    { label: "Carbs", val: `${plan.carbs}g`, pct: "40%", c: "#FF4D00" },
                    { label: "Protein", val: `${plan.protein}g`, pct: "30%", c: css.gold },
                    { label: "Fats", val: `${plan.fats}g`, pct: "30%", c: css.blue },
                  ].map(m => (
                    <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${css.border}`, borderRadius: 8, padding: "14px", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 30, fontWeight: 800, color: m.c }}>{m.pct}</div>
                      <div style={{ fontSize: 11, color: css.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>{m.val}/day</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                {[
                  { icon: "💧", title: `Drink ${plan.water}L Water/Day`, text: `Based on your ${user.weight}kg body weight. Muscle is 75% water. Never train dehydrated.`, hi: false },
                  { icon: "😴", title: `Sleep ${plan.sleep} Hours Minimum`, text: `Your ${user.gymHours}h workouts demand full recovery. Growth hormone peaks in deep sleep.`, hi: true },
                  { icon: "📈", title: "Progressive Overload", text: `Add +2.5kg to bar every 1–2 weeks. Track every session. No overload = no growth.`, hi: false },
                  { icon: "🚫", title: "Zero Cardio (Phase 1)", text: `You burn ~${plan.tdee} kcal at rest. Cardio steals from your surplus. Avoid for first 3 months.`, hi: true },
                ].map((t, i) => (
                  <div key={i} style={{ background: t.hi ? `${css.fire}07` : css.card, border: `1px solid`, borderColor: t.hi ? `${css.fire}30` : css.border, borderRadius: 10, padding: 18 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 6 }}>{t.title}</div>
                    <div style={{ fontSize: 13, color: css.muted, lineHeight: 1.6 }}>{t.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: MEALS ── */}
          {activeTab === "meals" && (
            <div className={animIn ? "animated" : ""} style={{ animationDelay: "0.1s" }}>
              <div style={{ background: `rgba(46,204,113,0.07)`, border: `1px solid rgba(46,204,113,0.2)`, borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#aaa" }}>
                <strong style={{ color: css.green }}>🏠 Hostel Pack:</strong> Always keep <strong style={{ color: "#fff" }}>eggs, milk, peanuts, peanut butter, bananas, bread</strong> in your room. These 6 items = +600 kcal with zero cooking.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {meals.map((m, i) => (
                  <div key={i} style={{
                    background: css.card, border: `1px solid ${css.border}`, borderRadius: 10,
                    padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14,
                    transition: "border-color 0.2s"
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = `${css.gold}40`}
                    onMouseLeave={e => e.currentTarget.style.borderColor = css.border}
                  >
                    <div style={{ background: `rgba(255,184,0,0.1)`, border: `1px solid rgba(255,184,0,0.2)`, borderRadius: 6, padding: "6px 10px", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: css.gold, letterSpacing: 1, whiteSpace: "nowrap", textAlign: "center", minWidth: 78 }}>
                      {m.time}<br />{m.tag}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {m.name} <Tag color={css.green}>{m.badge}</Tag>
                      </div>
                      <div style={{ fontSize: 13, color: css.muted, lineHeight: 1.5 }}>{m.items}</div>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: css.fire, whiteSpace: "nowrap", textAlign: "right" }}>
                      {m.cal}<br /><span style={{ fontSize: 11, color: css.muted }}>kcal</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: "12px 16px", background: `rgba(255,77,0,0.05)`, border: `1px solid ${css.fire}20`, borderRadius: 8, fontSize: 13, color: "#aaa" }}>
                <strong style={{ color: css.fire }}>Total:</strong> <strong style={{ color: "#fff" }}>{plan.dailyCalories.toLocaleString()} kcal/day</strong> across 7 meals · Eat every 2.5–3 hours · Never skip meals
              </div>
            </div>
          )}

          {/* ── TAB: GYM ── */}
          {activeTab === "gym" && (
            <div className={animIn ? "animated" : ""} style={{ animationDelay: "0.1s" }}>
              <div style={{ background: `rgba(255,77,0,0.07)`, border: `1px solid ${css.fire}25`, borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#aaa" }}>
                <strong style={{ color: css.fire }}>⚡ Volume set to {plan.setsBase} sets</strong> based on your {user.gymHours}h/day gym time. Heavy compounds first — always.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {workout.map((day, i) => (
                  <div key={i} style={{ background: css.card, border: `1px solid ${css.border}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${css.border}` }}>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>{day.day}</div>
                      <Tag color={day.color}>{day.focus}</Tag>
                    </div>
                    <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {day.exercises.map((ex, j) => (
                        <div key={j} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{ex.name}</div>
                          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700, color: css.fire, whiteSpace: "nowrap" }}>{ex.sets} sets</div>
                          <div style={{ fontSize: 12, color: css.muted, whiteSpace: "nowrap", minWidth: 58, textAlign: "right" }}>{ex.reps} reps</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ background: css.card, border: `1px solid ${css.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${css.border}` }}>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>Sat – Sun</div>
                    <Tag color={css.muted}>Active Rest</Tag>
                  </div>
                  <div style={{ padding: "18px", textAlign: "center", color: css.muted, fontSize: 14 }}>
                    🚶 Light walk 20–30 min · Stretching · Foam rolling<br />
                    <span style={{ color: "#333", fontSize: 12, marginTop: 6, display: "block" }}>No cardio. Your job is to EAT and RECOVER.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: TIMELINE ── */}
          {activeTab === "timeline" && (
            <div className={animIn ? "animated" : ""} style={{ animationDelay: "0.1s" }}>
              <div style={{ background: `rgba(255,184,0,0.06)`, border: `1px solid rgba(255,184,0,0.2)`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#aaa" }}>
                <strong style={{ color: css.gold }}>📊 Target:</strong> <strong style={{ color: "#fff" }}>+{user.targetGain}kg in {user.months} months</strong> = {plan.gainPerMonth}kg/month = {plan.gainPerWeek}kg/week · Weigh in every Sunday morning
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 22, top: 0, bottom: 0, width: 1, background: css.border }} />
                {timeline.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 20, paddingBottom: 28, position: "relative" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: i === 0 ? `${css.fire}18` : css.card2,
                      border: `2px solid`, borderColor: i === 0 ? css.fire : css.border,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, color: css.fire,
                      position: "relative", zIndex: 1
                    }}>M{t.month}</div>
                    <div style={{ paddingTop: 10 }}>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>Month {t.month} — {t.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: css.gold, marginBottom: 4 }}>+{t.gain} KG expected</div>
                      <div style={{ fontSize: 13, color: css.muted, lineHeight: 1.6 }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 20, position: "relative" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: `${css.green}18`, border: `2px solid ${css.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, position: "relative", zIndex: 1 }}>🎯</div>
                  <div style={{ paddingTop: 10 }}>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, color: css.green, letterSpacing: 1 }}>FINAL — Target Achieved</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: css.gold, marginBottom: 4 }}>TOTAL: +{user.targetGain} KG LEAN MUSCLE</div>
                    <div style={{ fontSize: 13, color: css.muted }}>You went from {user.weight}kg → {user.weight + user.targetGain}kg. Now choose: continue bulk or mini-cut to reveal gains.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: SUPPLEMENTS ── */}
          {activeTab === "supps" && (
            <div className={animIn ? "animated" : ""} style={{ animationDelay: "0.1s" }}>
              <div style={{ background: `rgba(255,77,0,0.05)`, border: `1px solid ${css.fire}20`, borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#aaa" }}>
                <strong style={{ color: css.fire }}>Rule:</strong> Real food {'>'} supplements always. Get your {plan.protein}g protein from eggs + milk + dal + chicken first. Supps just fill the gap.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
                {supps.map((s, i) => (
                  <div key={i} style={{ background: css.card, border: `1px solid ${css.border}`, borderRadius: 10, padding: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 32 }}>{s.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {s.name} <Tag color={i < 2 ? css.fire : css.muted}>{s.priority}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: css.fire, fontWeight: 600, marginBottom: 6 }}>{s.when}</div>
                      <div style={{ fontSize: 13, color: css.muted, lineHeight: 1.6 }}>{s.note}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: "16px 18px", background: css.card, border: `1px solid ${css.border}`, borderRadius: 10 }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10, letterSpacing: 1 }}>📦 ESTIMATED MONTHLY BUDGET</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                  {[
                    { item: "Creatine", price: "₹170/mo", note: "~600/3mo" },
                    { item: "Whey Protein", price: "₹1,200–2,000", note: "per kg" },
                    { item: "Vitamin D3", price: "₹150–300", note: "per month" },
                    { item: "Magnesium", price: "₹200–400", note: "per month" },
                  ].map((b, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontSize: 12, color: css.muted, marginBottom: 2 }}>{b.item}</div>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700, color: css.gold }}>{b.price}</div>
                      <div style={{ fontSize: 11, color: "#444" }}>{b.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Edit button */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button onClick={() => { setStep("form"); setAnimIn(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{
              padding: "12px 32px", background: "transparent", border: `1px solid ${css.border}`,
              borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16,
              fontWeight: 700, letterSpacing: 1, color: css.muted, cursor: "pointer",
              transition: "all 0.18s"
            }}
              onMouseEnter={e => { e.target.style.borderColor = css.fire; e.target.style.color = css.fire }}
              onMouseLeave={e => { e.target.style.borderColor = css.border; e.target.style.color = css.muted }}
            >← EDIT MY STATS</button>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", padding: "20px", fontSize: 11, color: "#222", letterSpacing: 1 }}>
        HARDGAINER PROTOCOL v2.0 · PERSONALIZED ECTOMORPH ENGINE · CONSULT A PROFESSIONAL FOR MEDICAL ADVICE
      </div>
    </div>

  );
}
