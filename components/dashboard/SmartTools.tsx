"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useUserData } from "@/lib/context/user-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
              <img src={icon} className="h-40 w-40"/>
              <p className="text-xl font-semibold leading-tight">{label}</p>
            </button>
          );
        })}
      </div>

      {openTool ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpenTool(null);
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-lg rounded-3xl bg-white p-6 text-[#0d2e38] shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#6a7f87]">
                  Smart Tool
                </p>
                <h3 id={titleId} className="mt-1 text-2xl font-semibold">
                  {openTool}
                </h3>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpenTool(null)}
                className="rounded-full bg-[#0d2e38] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a5d]/40 focus-visible:ring-offset-2"
              >
                Close
              </button>
            </div>

            {openTool === "Goal Tracker" ? (
              <div className="mt-4">
                <p className="text-sm leading-7 text-[#35515B]">
                  Set your daily <span className="font-semibold">nutritional targets</span>. These targets are saved locally and to your account when signed in.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col">
                    <span className="text-xs text-[#6a7f87]">Calories (kcal)</span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={nutritionGoals.calories ?? ""}
                      onChange={(e) => {
                        hasUserEditedGoals.current = true;
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setNutritionGoals((p) => ({ ...p, calories: v }));
                      }}
                      placeholder="e.g. 2000"
                      className="mt-1 rounded-lg border border-[#e6eef0] px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-xs text-[#6a7f87]">Protein (g)</span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={nutritionGoals.protein_g ?? ""}
                      onChange={(e) => {
                        hasUserEditedGoals.current = true;
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setNutritionGoals((p) => ({ ...p, protein_g: v }));
                      }}
                      placeholder="e.g. 75"
                      className="mt-1 rounded-lg border border-[#e6eef0] px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-xs text-[#6a7f87]">Carbs (g)</span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={nutritionGoals.carbs_g ?? ""}
                      onChange={(e) => {
                        hasUserEditedGoals.current = true;
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setNutritionGoals((p) => ({ ...p, carbs_g: v }));
                      }}
                      placeholder="e.g. 250"
                      className="mt-1 rounded-lg border border-[#e6eef0] px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-xs text-[#6a7f87]">Fat (g)</span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={nutritionGoals.fat_g ?? ""}
                      onChange={(e) => {
                        hasUserEditedGoals.current = true;
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setNutritionGoals((p) => ({ ...p, fat_g: v }));
                      }}
                      placeholder="e.g. 70"
                      className="mt-1 rounded-lg border border-[#e6eef0] px-3 py-2 text-sm outline-none"
                    />
                  </label>
                </div>

                {/* Progress pies using DB daily totals (only show when a goal is set) */}
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {nutritionGoals.calories != null && (
                    <div className="flex items-center gap-4">
                      <ProgressPie
                        label="Calories"
                        value={userData?.calories ?? 0}
                        goal={nutritionGoals.calories}
                        color="#f97316"
                      />
                    </div>
                  )}

                  {nutritionGoals.protein_g != null && (
                    <div className="flex items-center gap-4">
                      <ProgressPie
                        label="Protein"
                        value={userData?.protein ?? 0}
                        goal={nutritionGoals.protein_g}
                        color="#10b981"
                      />
                    </div>
                  )}

                  {/** Optional: show carbs/fat if user set goals */}
                  {nutritionGoals.carbs_g != null && (
                    <div className="flex items-center gap-4">
                      <ProgressPie
                        label="Carbs"
                        value={userData?.carbs ?? 0}
                        goal={nutritionGoals.carbs_g}
                        color="#3b82f6"
                      />
                    </div>
                  )}

                  {nutritionGoals.fat_g != null && (
                    <div className="flex items-center gap-4">
                      <ProgressPie
                        label="Fat"
                        value={userData?.fat ?? 0}
                        goal={nutritionGoals.fat_g}
                        color="#ef4444"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-[#6a7f87]">
                    {savedAt ? <SavedTimestamp ts={savedAt} /> : "Saved locally"}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setNutritionGoals({ calories: null, protein_g: null, carbs_g: null, fat_g: null });
                        try { await saveNutritionGoals(); } catch {};
                      }}
                      className="rounded-full border border-[#e6eef0] px-3 py-1 text-sm text-[#0d2e38]"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={async () => { setSaveStatus('saving'); await saveNutritionGoals(); }}
                      className="rounded-full border border-[#e6eef0] px-3 py-1 text-sm text-[#0d2e38]"
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
                      className="rounded-full bg-[#063643] px-3 py-1 text-sm font-semibold text-white"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[#35515B]">
                This is a placeholder modal for <span className="font-semibold">{openTool}</span>.
                We can wire this up to the real tool flow next.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

