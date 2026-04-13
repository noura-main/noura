"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useUserData } from "@/lib/context/user-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import FallbackImage from "@/components/ui/FallbackImage";
import HealthTrendsModal from "@/components/dashboard/HealthTrendsModal";
import IngredientSwapModal from "@/components/recipes/IngredientSwapModal";
import { Target, X } from "lucide-react";

function SavedTimestamp({ ts }: { ts: number }) {
  const diff = Date.now() - ts;
  if (diff < 5000) return <span>Saved just now</span>;
  if (diff < 60000) return <span>Saved {Math.round(diff / 1000)}s ago</span>;
  if (diff < 3600000) return <span>Saved {Math.round(diff / 60000)}m ago</span>;
  return <span>Saved {Math.round(diff / 3600000)}h ago</span>;
}

type SmartTool = {
  label: string;
  icon: string;
};

const SMART_TOOLS: SmartTool[] = [
  { label: "AI Assistant", icon: "/dashboard/robot.png" },
  { label: "Health Insight", icon: "/dashboard/analytics.png" },
  { label: "Scan Receipt", icon: "/dashboard/receipt.png" },
  { label: "Smart Swaps", icon: "/dashboard/swap.png" },
  { label: "Goal Tracker", icon: "/dashboard/target.png" },
];

export function SmartTools() {
  const [activeTool, setActiveTool] = useState<string>("AI Assistant");
  const [openTool, setOpenTool] = useState<string | null>(null);
  
  type NutritionGoals = { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null };
  const NUTRI_GOALS_KEY = "noura_nutrition_goals_v1";
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>(() => ({ calories: null, protein_g: null, carbs_g: null, fat_g: null }));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPersistingRef = useRef(false);
  const hasUserEditedGoals = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');

  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const userData = useUserData();

  function ProgressPie({ label, value, goal, color }: { label: string; value: number; goal: number | null; color: string }) {
    const pct = !goal || goal <= 0 ? 0 : Math.min(1, value / goal);
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const dash = circumference * pct;

    return (
      <div className="flex items-center gap-3">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <g transform="translate(6,6)">
            <circle cx="36" cy="36" r={radius} fill="none" stroke="#eef2f3" strokeWidth="12" />
            <circle
              cx="36"
              cy="36"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              transform="rotate(-90 36 36)"
            />
            <text x="36" y="40" textAnchor="middle" fontSize="12" fill="#0d2e38" fontWeight={600}>
              {Math.round(pct * 100)}%
            </text>
          </g>
        </svg>
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-[#6a7f87]">{value} / {goal ?? "—"}</div>
        </div>
      </div>
    );
  }

  const activeIndex = useMemo(
    () => Math.max(0, SMART_TOOLS.findIndex((tool) => tool.label === activeTool)),
    [activeTool]
  );

  useEffect(() => {
    if (!openTool) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenTool(null);
    };

    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openTool]);

  // Load nutrition goals from DB (fallback to localStorage) when modal opens
  useEffect(() => {
    if (openTool !== "Goal Tracker") return;
    // Reset the edit guard whenever the modal opens so a fresh load never counts as an edit
    hasUserEditedGoals.current = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const userRes = await supabase.auth.getUser();
          const user = (userRes as any)?.data?.user;
          if (user) {
            const { data, error } = await supabase
              .from("user_nutrition_goals")
              .select("calories, protein_g, carbs_g, fat_g")
              .eq("user_id", user.id)
              .single();
            if (!error && data) {
              setNutritionGoals({
                calories: data.calories ?? null,
                protein_g: data.protein_g ?? null,
                carbs_g: data.carbs_g ?? null,
                fat_g: data.fat_g ?? null,
              });
              return;
            }
          }
        }
      } catch (err) {
        console.error("Failed to load nutrition goals from DB", err);
      }

      try {
        const raw = localStorage.getItem(NUTRI_GOALS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as NutritionGoals;
          setNutritionGoals(parsed);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [openTool]);

  async function saveNutritionGoals() {
    try {
      localStorage.setItem(NUTRI_GOALS_KEY, JSON.stringify(nutritionGoals));
      setSavedAt(Date.now());
    } catch (e) {
      console.warn("Failed to persist nutrition goals to localStorage:", e);
    }

    if (isPersistingRef.current) return;
    isPersistingRef.current = true;
    setSaveStatus('saving');
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        console.warn("Supabase client not available");
        setSaveStatus('idle');
        return;
      }
      const userRes = await supabase.auth.getUser();
      const user = (userRes as any)?.data?.user;
      if (!user) {
        console.warn("No signed-in user; skipping DB persist");
        setSaveStatus('idle');
        return;
      }

      const payload = {
        user_id: user.id,
        calories: nutritionGoals.calories,
        protein_g: nutritionGoals.protein_g,
        carbs_g: nutritionGoals.carbs_g,
        fat_g: nutritionGoals.fat_g,
      };

      const { data, error } = await supabase.from("user_nutrition_goals").upsert(payload, { onConflict: "user_id" }).select();
      if (error) {
        console.error("Supabase upsert error:", error);
        setSaveStatus('error');
        return;
      }
      console.debug("Nutrition goals upserted:", data);
      setSavedAt(Date.now());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) {
      console.error("Failed to persist nutrition goals to DB:", err);
      setSaveStatus('error');
    } finally {
      isPersistingRef.current = false;
    }
  }

  // Debounced save effect — only runs if the user has actually edited a field
  useEffect(() => {
    if (!hasUserEditedGoals.current) return;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveNutritionGoals();
    }, 900);

    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [nutritionGoals]);

  return (
    <>
      <div className="flex flex-wrap gap-3 justify-center">
        {SMART_TOOLS.map(({ label, icon }, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                setActiveTool(label);
                setOpenTool(label);
              }}
              aria-pressed={isActive}
              aria-haspopup="dialog"
              className={`flex min-h-[165px] w-[160px] flex-col flex justify-center gap-y-4 rounded-3xl p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a5d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eceef0] ${
                isActive
                  ? "bg-[#063643] text-white"
                  : "bg-white text-[#0d2e38] shadow-sm hover:bg-[#f7fafb]"
              }`}
            >
              <FallbackImage src={icon} alt={label} className="h-40 w-40"/>
              <p className="text-xl font-semibold leading-tight">{label}</p>
            </button>
          );
        })}
      </div>

      {openTool === "Health Insight" ? (
        <HealthTrendsModal onClose={() => setOpenTool(null)} />
      ) : openTool === "Smart Swaps" ? (
        <IngredientSwapModal onClose={() => setOpenTool(null)} />
      ) : openTool ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(6,54,67,0.65)", backdropFilter: "blur(6px)" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpenTool(null);
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(61,132,137,0.18)",
            }}
          >
            {/* Header */}
            <div
              className="relative flex items-center justify-between px-6 py-5"
              style={{ background: "#0D2D35" }}
            >
              <div>
                <div className="flex items-center gap-2">
                  {openTool === "Goal Tracker" && (
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-xl"
                      style={{ background: "rgba(61,132,137,0.20)" }}
                    >
                      <Target size={16} style={{ color: "#3D8489" }} />
                    </div>
                  )}
                  <span
                    className="text-[10px] font-black tracking-[0.22em]"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {openTool === "Goal Tracker" ? "NUTRITION TARGETS" : "SMART TOOL"}
                  </span>
                </div>
                <h2 className="mt-0.5 text-2xl font-bold text-white">
                  {openTool}
                </h2>
              </div>
              <button
                onClick={() => setOpenTool(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                style={{ color: "rgba(255,255,255,0.60)" }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="max-h-[75vh] overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {openTool === "Goal Tracker" ? (
                <div>
                  <p
                    className="mb-4 text-sm leading-relaxed"
                    style={{ color: "rgba(13,45,53,0.65)" }}
                  >
                    Set your daily nutritional targets. These are saved locally and synced to your account when signed in.
                  </p>

                  {/* Input cards grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Calories", key: "calories", placeholder: "e.g. 2000", unit: "kcal" },
                      { label: "Protein", key: "protein_g", placeholder: "e.g. 75", unit: "g" },
                      { label: "Carbs", key: "carbs_g", placeholder: "e.g. 250", unit: "g" },
                      { label: "Fat", key: "fat_g", placeholder: "e.g. 70", unit: "g" },
                    ].map(({ label, key, placeholder, unit }) => (
                      <div key={key}>
                        <label
                          className="mb-1.5 block text-xs font-bold"
                          style={{ color: "rgba(13,45,53,0.50)" }}
                        >
                          {label} ({unit})
                        </label>
                        <input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={(nutritionGoals as any)[key] ?? ""}
                          onChange={(e) => {
                            hasUserEditedGoals.current = true;
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            setNutritionGoals((p: any) => ({ ...p, [key]: v }));
                          }}
                          placeholder={placeholder}
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none transition-all"
                          style={{
                            background: "rgba(13,45,53,0.04)",
                            border: "1.5px solid rgba(61,132,137,0.18)",
                            color: "#0D2D35",
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#3D8489")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(61,132,137,0.18)")}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Progress cards */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    {nutritionGoals.calories != null && (
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: "linear-gradient(135deg,rgba(249,115,22,0.10),rgba(249,115,22,0.04))",
                          border: "1px solid rgba(249,115,22,0.20)",
                        }}
                      >
                        <p className="text-[10px] font-bold tracking-wide" style={{ color: "rgba(13,45,53,0.40)" }}>
                          CALORIES
                        </p>
                        <ProgressPie
                          label=""
                          value={userData?.calories ?? 0}
                          goal={nutritionGoals.calories}
                          color="#f97316"
                        />
                      </div>
                    )}
                    {nutritionGoals.protein_g != null && (
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: "linear-gradient(135deg,rgba(16,185,129,0.10),rgba(16,185,129,0.04))",
                          border: "1px solid rgba(16,185,129,0.20)",
                        }}
                      >
                        <p className="text-[10px] font-bold tracking-wide" style={{ color: "rgba(13,45,53,0.40)" }}>
                          PROTEIN
                        </p>
                        <ProgressPie
                          label=""
                          value={userData?.protein ?? 0}
                          goal={nutritionGoals.protein_g}
                          color="#10b981"
                        />
                      </div>
                    )}
                    {nutritionGoals.carbs_g != null && (
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: "linear-gradient(135deg,rgba(59,130,246,0.10),rgba(59,130,246,0.04))",
                          border: "1px solid rgba(59,130,246,0.20)",
                        }}
                      >
                        <p className="text-[10px] font-bold tracking-wide" style={{ color: "rgba(13,45,53,0.40)" }}>
                          CARBS
                        </p>
                        <ProgressPie
                          label=""
                          value={userData?.carbs ?? 0}
                          goal={nutritionGoals.carbs_g}
                          color="#3b82f6"
                        />
                      </div>
                    )}
                    {nutritionGoals.fat_g != null && (
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: "linear-gradient(135deg,rgba(239,68,68,0.10),rgba(239,68,68,0.04))",
                          border: "1px solid rgba(239,68,68,0.20)",
                        }}
                      >
                        <p className="text-[10px] font-bold tracking-wide" style={{ color: "rgba(13,45,53,0.40)" }}>
                          FAT
                        </p>
                        <ProgressPie
                          label=""
                          value={userData?.fat ?? 0}
                          goal={nutritionGoals.fat_g}
                          color="#ef4444"
                        />
                      </div>
                    )}
                  </div>

                  {/* Save status and buttons */}
                  <div className="mt-6 flex items-center justify-between border-t" style={{ borderColor: "rgba(61,132,137,0.14)" }}>
                    <p className="pt-4 text-[11px]" style={{ color: "rgba(13,45,53,0.35)" }}>
                      {savedAt ? <SavedTimestamp ts={savedAt} /> : "Saved locally"}
                    </p>
                    <div className="flex gap-2 pt-4">
                      <button
                        type="button"
                        onClick={async () => {
                          setNutritionGoals({ calories: null, protein_g: null, carbs_g: null, fat_g: null });
                          try { await saveNutritionGoals(); } catch {}
                        }}
                        className="rounded-full border-2 px-4 py-1.5 text-xs font-bold transition-all hover:bg-[#0D2D35] hover:text-white"
                        style={{ borderColor: "#0D2D35", color: "#0D2D35" }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={async () => { setSaveStatus('saving'); await saveNutritionGoals(); }}
                        className="rounded-full border-2 px-4 py-1.5 text-xs font-bold transition-all hover:bg-[#0D2D35] hover:text-white"
                        style={{ borderColor: "#0D2D35", color: "#0D2D35" }}
                      >
                        {saveStatus === 'saving' ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const reset = { calories: null, protein_g: null, carbs_g: null, fat_g: null };
                          setNutritionGoals(reset);
                          try {
                            localStorage.removeItem(NUTRI_GOALS_KEY);
                            setSavedAt(Date.now());
                          } catch {}
                        }}
                        className="rounded-full px-4 py-1.5 text-xs font-bold text-white transition-all hover:opacity-90"
                        style={{ background: "#0D2D35" }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: "rgba(13,45,53,0.55)" }}>
                  This is a placeholder modal for <span className="font-semibold">{openTool}</span>.
                  We can wire this up to the real tool flow next.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

