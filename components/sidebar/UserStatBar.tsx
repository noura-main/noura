"use client";

import { useState } from "react";
import UserInfo from "@/components/dashboard/UserInfo";
import DailyTracking from "@/components/dashboard/DailyTracking";
import MealPlan from "@/components/dashboard/MealPlan";
import HealthTrendsModal from "@/components/dashboard/HealthTrendsModal";
import { useUserData } from "@/lib/context/user-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { addToDailyLog } from "@/lib/utils/daily-log";
import { deductIngredientsFromPantry } from "@/lib/utils/deduct-pantry";

import {
  Salad,
  Soup,
  Wheat,
  ShoppingBasket,
  UserRound,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const meals = [
  { label: "Breakfast", detail: "breakfast", icon: Wheat },
  { label: "Lunch", detail: "lunch", icon: Salad },
  { label: "Dinner", detail: "dinner", icon: Soup },
];

// ── Insight logic ──────────────────────────────────────────────────────────────

type Mood = "high" | "stable" | "low";

function getMoodInsight(
  mood: Mood,
  calories: number,
  protein: number,
  fat: number,
  carbs: number
): { headline: string; body: string; accent: string } {
  const total = protein + fat + carbs;
  const proteinPct = total > 0 ? (protein / total) * 100 : 0;
  const carbsPct   = total > 0 ? (carbs   / total) * 100 : 0;
  const fatPct     = total > 0 ? (fat     / total) * 100 : 0;

  if (mood === "low") {
    if (carbsPct > 60)
      return {
        headline: "High-carb slump detected",
        body: "Your carbs are dominating today's macros. Try pairing tomorrow's lunch with 10–15g extra protein to stabilise blood sugar.",
        accent: "#ef4444",
      };
    if (proteinPct < 20)
      return {
        headline: "Protein may be too low",
        body: "Low protein can reduce satiety and mental focus. Aim for at least 20% of your macros from protein.",
        accent: "#f97316",
      };
    if (calories < 800)
      return {
        headline: "You might be under-fuelled",
        body: "Under 800 kcal logged today. Low energy is expected — make sure you're eating enough for your activity level.",
        accent: "#f97316",
      };
    return {
      headline: "We couldn't pinpoint a cause",
      body: "Your macros look okay. The slump might be sleep or hydration. Try a glass of water and a protein-rich snack.",
      accent: "#6b7280",
    };
  }

  if (mood === "stable") {
    if (proteinPct >= 20 && carbsPct <= 55)
      return {
        headline: "Solid macro balance",
        body: "Your ratios are well-distributed today. This is a good baseline to repeat on busy days.",
        accent: "#3D8489",
      };
    return {
      headline: "Steady as she goes",
      body: "Nothing in today's macros stands out negatively. Keep logging to spot longer-term patterns.",
      accent: "#3D8489",
    };
  }

  // mood === "high"
  if (proteinPct >= 25 && carbsPct >= 35 && carbsPct <= 55)
    return {
      headline: "Golden Ratio achieved! 🎯",
      body: `${Math.round(proteinPct)}% Protein · ${Math.round(carbsPct)}% Carbs · ${Math.round(fatPct)}% Fats — this mix seems to be your energy sweet spot. Save this day's meals as a template.`,
      accent: "#16a34a",
    };
  if (proteinPct >= 25)
    return {
      headline: "High protein day",
      body: "Protein-led days often support sustained energy and muscle recovery. Great work!",
      accent: "#16a34a",
    };
  return {
    headline: "Energy is high — nice!",
    body: "Keep track of what you ate today. Your macros may explain the boost — check the Health Insights panel.",
    accent: "#16a34a",
  };
}

// ── Energy Mood Picker component ───────────────────────────────────────────────

interface EnergyMoodPickerProps {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mood: Mood | null;
  onMood: (m: Mood) => void;
}

const MOODS: { key: Mood; emoji: string; label: string }[] = [
  { key: "high",   emoji: "⚡", label: "High"   },
  { key: "stable", emoji: "😐", label: "Stable" },
  { key: "low",    emoji: "😴", label: "Low"    },
];

function EnergyMoodPicker({ calories, protein, fat, carbs, mood, onMood }: EnergyMoodPickerProps) {
  const insight = mood ? getMoodInsight(mood, calories, protein, fat, carbs) : null;

  return (
    <div
      className="relative rounded-2xl border p-4"
      style={{
        background: "rgba(255,255,255,0.70)",
        borderColor: "rgba(61,132,137,0.18)",
      }}
    >
      <p
        className="mb-3 text-[10px] font-black tracking-[0.22em]"
        style={{ color: "rgba(13,46,56,0.40)" }}
      >
        HOW&apos;S YOUR ENERGY TODAY?
      </p>

      <div className="flex items-center justify-between gap-2">
        {MOODS.map(({ key, emoji, label }) => (
          <button
            key={key}
            onClick={() => onMood(key)}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-all duration-200"
            style={{
              background: mood === key ? "rgba(61,132,137,0.12)" : "transparent",
              border: `1.5px solid ${mood === key ? "#3D8489" : "rgba(61,132,137,0.15)"}`,
              transform: mood === key ? "scale(1.04)" : "scale(1)",
            }}
          >
            <span className="text-xl leading-none">{emoji}</span>
            <span
              className="text-[10px] font-semibold"
              style={{ color: mood === key ? "#0D2D35" : "rgba(13,46,56,0.45)" }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* In-flow expandable insight panel: animates height/padding so width doesn't change */}
      <div
        className="mt-3 rounded-xl overflow-hidden transition-[max-height,padding,opacity] duration-200"
        style={{
          background: insight ? `${insight.accent}12` : "transparent",
          border: insight ? `1px solid ${insight.accent}30` : "none",
          maxHeight: insight ? "260px" : "0px",
          padding: insight ? "12px" : "0px",
          opacity: insight ? 1 : 0,
        }}
        aria-hidden={!insight}
      >
        {insight && (
          <div>
            <p className="text-xs font-bold leading-snug" style={{ color: insight.accent }}>
              {insight.headline}
            </p>
            <p className="mt-1 text-[11px] leading-snug" style={{ color: "rgba(13,46,56,0.65)" }}>
              {insight.body}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function UserStatBar() {
  const snack = useUserData();
  const [showSnackModal, setShowSnackModal] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [mood, setMood] = useState<"high" | "stable" | "low" | null>(null);
  const [confirmEaten, setConfirmEaten] = useState(false);
  const [deletingSnack, setDeletingSnack] = useState(false);

  async function handleEatenConfirmed() {
    setDeletingSnack(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toLocaleDateString("en-CA");

      // Read snack macros + ingredients fresh from DB (not stale context state)
      const { data: freshSnack } = await supabase
        .from("meal_plans")
        .select("calories, protein_g, fat_g, carbs_g, recipe_name, ingredients")
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("meal_type", "snack")
        .single();

      let snackProtein: number = freshSnack?.protein_g ?? null;
      let snackFat: number     = freshSnack?.fat_g     ?? null;
      let snackCarbs: number   = freshSnack?.carbs_g   ?? null;
      const snackCalories: number = freshSnack?.calories ?? snack.snack_calories ?? 0;

      // If still null, fall back to user_generated_recipes blob
      if ((snackProtein == null || snackFat == null || snackCarbs == null) && (freshSnack?.recipe_name || snack.snack_name)) {
        const snackName = freshSnack?.recipe_name ?? snack.snack_name ?? "";
        const { data: cachedRow } = await supabase
          .from("user_generated_recipes")
          .select("recipes")
          .eq("user_id", user.id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const allRecipes: { name?: string; protein_g?: number; fat_g?: number; carbs_g?: number }[] =
          cachedRow?.recipes
            ? Object.values(cachedRow.recipes as Record<string, unknown[]>).flat() as never
            : [];

        const match = allRecipes.find(
          (r) => r.name?.toLowerCase().trim() === snackName.toLowerCase().trim()
        );

        snackProtein = (match?.protein_g != null ? Number(match.protein_g) : null) ?? 0;
        snackFat     = (match?.fat_g     != null ? Number(match.fat_g)     : null) ?? 0;
        snackCarbs   = (match?.carbs_g   != null ? Number(match.carbs_g)   : null) ?? 0;

        if (match && (snackProtein > 0 || snackFat > 0 || snackCarbs > 0)) {
          // Patch the DB row for future lookups
          await supabase
            .from("meal_plans")
            .update({ protein_g: snackProtein, fat_g: snackFat, carbs_g: snackCarbs })
            .eq("user_id", user.id)
            .eq("date", today)
            .eq("meal_type", "snack");
        }
      }

      console.log("[snack eaten] writing to daily_logs:", { snackCalories, snackProtein, snackFat, snackCarbs });

      // Accumulate into daily_logs
      await addToDailyLog(supabase, user.id, today, {
        calories: snackCalories,
        protein: snackProtein ?? 0,
        fat_g: snackFat ?? 0,
        carbs_g: snackCarbs ?? 0,
      });

      // Deduct used ingredients from pantry
      const snackIngredients: string[] = Array.isArray(freshSnack?.ingredients)
        ? (freshSnack.ingredients as unknown[]).map(String).filter(Boolean)
        : [];
      await deductIngredientsFromPantry(supabase, user.id, snackIngredients);

      // Delete snack from today's plan
      await supabase
        .from("meal_plans")
        .delete()
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("meal_type", "snack");

      setShowSnackModal(false);
      setConfirmEaten(false);
      snack.refresh();
    } catch (err) {
      console.error("[UserStatBar] snack eaten error", err);
    } finally {
      setDeletingSnack(false);
    }
  }

  const prepTimeLabel = snack.snack_prep_time
    ? snack.snack_prep_time >= 60
      ? `${Math.floor(snack.snack_prep_time / 60)}h ${snack.snack_prep_time % 60 > 0 ? `${snack.snack_prep_time % 60}m` : ""}`.trim()
      : `${snack.snack_prep_time} min`
    : null;

  const instructionSteps = snack.snack_instructions
    ? snack.snack_instructions
        .replace(/\\n/g, "\n")
        .split(/\n|(?=Step\s+\d+:)/i)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <>
    <aside className="hidden h-full flex-col rounded-3xl border border-[#e0e5e9] bg-white p-5 lg:flex overflow-y-auto pb-6">
          <header className="flex items-start justify-between border-b border-[#edf1f4] pb-4">
            <div>
              <p className="text-2xl font-semibold">
                Hello, <UserInfo field="full_name" /> !!
              </p>
              <p className="text-sm text-[#6a7f87]">
                <UserInfo field="email" />
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#f2f4f6]">
              {snack.avatar_url ? (
                <img
                  src={snack.avatar_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-6 w-6 text-[#0d2e38]" />
              )}
            </div>
          </header>

          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Nutrition</h3>
              <button
                onClick={() => setShowTrends(true)}
                className="rounded-full px-2 py-0.5 text-sm font-bold text-[#8aa0a8] transition-colors hover:bg-[#f0f4f5] hover:text-[#0d2e38]"
                title="View Health Trends"
              >
                ...
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-2xl bg-[#0d2e38] p-3 text-white">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/75">
                    Calories
                  </p>
                </div>
                <p className="text-4xl font-semibold leading-none">
                  <DailyTracking field="calories"/>
                </p>
                <p className="mt-1 text-sm text-white/80">Today</p>
              </article>
              <article className="rounded-2xl border border-[#e5eaed] bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-[#7f9199]">
                    Protein
                  </p>
                </div>
                <p className="text-4xl font-semibold leading-none text-[#0d2e38]">
                  <DailyTracking field="protein"/>g
                </p>
                <p className="mt-1 text-sm text-[#6a7f87]">Today</p>
              </article>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Today&apos;s Plan</h3>
              <span className="text-[#8aa0a8]">...</span>
            </div>
            <div className="space-y-2">
              {meals.map((meal) => (
                <article
                  key={meal.label}
                  className="flex items-center gap-3 rounded-2xl border border-[#e8edf0] bg-[#f8fafb] p-3"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#dceef1] text-[#0b4a5d]">
                    <meal.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{meal.label}</p>
                    <p className="text-sm text-[#6a7f87]">
                    <MealPlan 
                      field={meal.detail as 'breakfast' | 'lunch' | 'dinner'} 
                    />
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="mt-4 mb-6">
            <EnergyMoodPicker
              calories={snack.calories}
              protein={snack.protein}
              fat={snack.fat}
              carbs={snack.carbs}
              mood={mood}
              onMood={setMood}
            />
          </div>

          <section className="mt-auto rounded-2xl bg-[#0d2e38] p-4 text-white">
            <button
              className="mt-3 w-full rounded-2xl bg-white/10 p-3 text-left transition hover:bg-white/20"
              onClick={() => setShowSnackModal(true)}
            >
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <ShoppingBasket className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{snack.snack_name ?? "No snack planned"}</p>
                  <p className="mt-0.5 text-xs text-white/60">Tap to view recipe</p>
                </div>
              </div>
            </button>
          </section>
        </aside>

      {/* ── Health Trends modal ── */}
      {showTrends && <HealthTrendsModal onClose={() => setShowTrends(false)} />}

      {/* ── Snack cook modal ── */}
      {showSnackModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(6,54,67,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSnackModal(false); }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="pr-4">
                <h2 className="text-2xl font-extrabold text-[#063643]">
                  {snack.snack_name ?? "Quick Snack"}
                </h2>
                {snack.snack_description && (
                  <p className="mt-1 text-sm text-[#4b6068]">{snack.snack_description}</p>
                )}
              </div>
              <button
                onClick={() => setShowSnackModal(false)}
                className="rounded-full p-1.5 transition-colors hover:bg-gray-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Badges */}
            {(snack.snack_calories != null || prepTimeLabel) && (
              <div className="mt-4 flex items-center gap-3">
                {snack.snack_calories != null && (
                  <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-[#063643]">
                    <Flame size={14} className="text-orange-400" /> {snack.snack_calories} kcal
                  </div>
                )}
                {prepTimeLabel && (
                  <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-[#063643]">
                    <Clock size={14} /> {prepTimeLabel}
                  </div>
                )}
              </div>
            )}

            {/* Ingredients */}
            {snack.snack_ingredients && snack.snack_ingredients.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-bold text-[#063643]">Ingredients</h3>
                <ul className="mt-2 space-y-1.5">
                  {snack.snack_ingredients.map((ing, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#334e52]">
                      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-5">
              <h3 className="text-sm font-bold text-[#063643]">Instructions</h3>
              {instructionSteps.length > 0 ? (
                <ol className="mt-2 space-y-2 text-sm text-[#334e52]">
                  {instructionSteps.map((step, i) => (
                    <li key={i} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-[#334e52]">No instructions available.</p>
              )}
            </div>

            {/* Mark as Eaten — two-step confirmation */}
            <div className="mt-6">
              {!confirmEaten ? (
                <div className="flex justify-end">
                  <button
                    onClick={() => setConfirmEaten(true)}
                    className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "#063643" }}
                  >
                    <CheckCircle2 size={16} />
                    Mark as Eaten
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                    <AlertTriangle size={15} />
                    This will remove the snack from today&apos;s plan. Are you sure?
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => setConfirmEaten(false)}
                      className="flex-1 rounded-full border border-orange-300 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEatenConfirmed}
                      disabled={deletingSnack}
                      className="flex-1 rounded-full py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                      style={{ background: "#063643" }}
                    >
                      {deletingSnack ? "Removing…" : "Yes, I Ate It!"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
