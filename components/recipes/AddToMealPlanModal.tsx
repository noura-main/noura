"use client";

import { useState } from "react";
import { X, CalendarDays, CheckCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUserData } from "@/lib/context/user-data";
import type { Recipe, MealType } from "@/lib/recipes/types";

interface Props {
  recipe: Recipe;
  mealType: MealType;
  onClose: () => void;
}

const MEAL_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch" },
  { value: "dinner",    label: "Dinner" },
  { value: "snack",     label: "Snack" },
];

function toDbMealType(t: MealType): string {
  // Map app `snacks` to DB `snack` so snacks are stored separately
  if (t === "snacks") return "snack";
  return t;
}

function todayString(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function stringifyIngredient(item: any): string {
  if (item == null) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "number" || typeof item === "bigint") return String(item);
  if (Array.isArray(item)) return item.map((it) => stringifyIngredient(it)).filter(Boolean).join(" ");
  if (typeof item === "object") {
    const nameKeys = ["name", "ingredient", "item", "label", "title", "text"];
    const qtyKeys = ["quantity", "qty", "amount", "count", "number", "num"];
    const unitKeys = ["unit", "quantity_unit", "u", "measure", "measurement", "measure_unit"];

    const name = nameKeys.map((k) => (k in item ? item[k] : undefined)).find((v) => v != null);
    const qty = qtyKeys.map((k) => (k in item ? item[k] : undefined)).find((v) => v != null);
    const unit = unitKeys.map((k) => (k in item ? item[k] : undefined)).find((v) => v != null);

    const parts: string[] = [];
    if (qty != null && String(qty).trim() !== "") parts.push(String(qty).trim());
    if (unit != null && String(unit).trim() !== "") parts.push(String(unit).trim());
    if (name != null) {
      if (typeof name === "string") parts.push(name.trim());
      else parts.push(stringifyIngredient(name));
    } else {
      const fallback = Object.values(item).find((v) => typeof v === "string" && v.trim().length > 0);
      if (fallback) parts.push(String(fallback).trim());
    }
    const joined = parts.join(" ").replace(/\s+/g, " ").trim();
    if (joined) return joined;

    const vals = Object.values(item)
      .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
      .filter(Boolean);
    return vals.join(" ").trim();
  }
  return String(item);
}

export default function AddToMealPlanModal({ recipe, mealType, onClose }: Props) {
  const today = todayString();
  const [date, setDate] = useState(today);
  const [selectedMeal, setSelectedMeal] = useState(toDbMealType(mealType));
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { refresh: refreshUserData } = useUserData();

  async function handleConfirm() {
    setStatus("saving");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase client unavailable");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to save a meal plan.");

      // Delete any existing row for this slot first, then insert fresh.
      // This avoids needing a unique DB constraint and guarantees all columns are written.
      const { error: deleteError } = await supabase
        .from("meal_plans")
        .delete()
        .eq("user_id", user.id)
        .eq("date", date)
        .eq("meal_type", selectedMeal);

      if (deleteError) {
        console.error("[AddToMealPlan] delete error", deleteError);
        throw deleteError;
      }

      const payload = {
        user_id: user.id,
        date,
        meal_type: selectedMeal,
        recipe_name: recipe.name,
        description: recipe.description ?? "",
        ingredients: (recipe.ingredients ?? []).map(stringifyIngredient),
        instructions: recipe.instructions ?? "",
        calories: recipe.calories ?? null,
        cook_time: recipe.prepTime ?? null,
        protein_g: recipe.protein_g ?? null,
        fat_g: recipe.fat_g ?? null,
        carbs_g: recipe.carbs_g ?? null,
      };
      console.log("[AddToMealPlan] inserting payload:", JSON.stringify(payload, null, 2));

      const { error: insertError } = await supabase
        .from("meal_plans")
        .insert(payload);

      if (insertError) {
        console.error("[AddToMealPlan] insert error", insertError);
        throw insertError;
      }
      setStatus("success");
      refreshUserData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,54,67,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-auto sm:w-11/12 md:w-3/4 lg:max-w-4xl rounded-2xl bg-white p-8 shadow-2xl">
        {/* Header row */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold" style={{ color: "#063643" }}>
              Add to Meal Plan
            </h2>
            <p className="mt-1 text-sm font-medium" style={{ color: "#7a9099" }}>
              {recipe.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition-colors hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={16} style={{ color: "#063643" }} />
          </button>
        </div>

        {/* ── Success state ── */}
        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle size={48} className="text-emerald-500" strokeWidth={1.6} />
            <p className="text-center text-base leading-relaxed" style={{ color: "#063643" }}>
              <span className="font-extrabold">{recipe.name}</span> added to{" "}
              <span className="font-bold capitalize">{selectedMeal}</span> on{" "}
              <span className="font-bold">{date}</span>!
            </p>
            <button
              onClick={onClose}
              className="rounded-full px-10 py-3 text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "#063643" }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* ── Date picker ── */}
            <div className="mb-5">
              <label
                className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "#7a9099" }}
              >
                <CalendarDays size={11} />
                Date
              </label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-[#063643]"
                style={{ borderColor: "rgba(6,54,67,0.18)", color: "#063643" }}
              />
            </div>

            {/* ── Meal type chips ── */}
            <div className="mb-5">
              <label
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "#7a9099" }}
              >
                Meal Type
              </label>
              <div className="grid grid-cols-4 gap-3">
                {MEAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedMeal(opt.value)}
                    className="rounded-xl py-3 text-sm font-bold transition-all duration-150 hover:opacity-90"
                    style={{
                      background:
                        selectedMeal === opt.value ? "#063643" : "rgba(6,54,67,0.07)",
                      color: selectedMeal === opt.value ? "#ffffff" : "#4b6068",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Error ── */}
            {status === "error" && (
              <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600">
                {errorMsg}
              </p>
            )}

            {/* ── Action buttons ── */}
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border py-3 text-sm font-bold transition-all hover:bg-gray-50"
                style={{ borderColor: "rgba(6,54,67,0.2)", color: "#4b6068" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={status === "saving"}
                className="flex-1 rounded-full py-3 text-sm font-bold text-white transition-all disabled:opacity-60 hover:opacity-90"
                style={{ background: "#063643" }}
              >
                {status === "saving" ? "Saving…" : "Add!"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
