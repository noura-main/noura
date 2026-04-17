"use client";

import { useState, useEffect } from "react";
import { NavbarUser } from "@/components/sidebar/NavbarUser";
import { UserStatBar } from "@/components/sidebar/UserStatBar";
import MealPlanHeader from "@/components/mealplan/MealPlanHeader";
import WeeklyCalendar, { getDateString } from "@/components/mealplan/WeeklyCalendar";
import MealCard from "@/components/mealplan/MealCard";
import type { MealCardProps } from "@/components/mealplan/MealCard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUserData } from "@/lib/context/user-data";
import { addToDailyLog } from "@/lib/utils/daily-log";
import { deductIngredientsFromPantry } from "@/lib/utils/deduct-pantry";

type DbMealType = "breakfast" | "lunch" | "dinner" | "snack";

function toCategory(t: DbMealType): MealCardProps["category"] {
  return t.toUpperCase() as MealCardProps["category"];
}

function parseIngredients(raw: unknown): string[] {
  if (!raw) return [];

  function stringifyIngredient(item: unknown): string {
    if (item == null) return "";
    if (typeof item === "string") return item;
    if (typeof item === "number") return String(item);
    if (Array.isArray(item)) return item.map(stringifyIngredient).filter(Boolean).join(", ");
    if (typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const prefer = ["name", "ingredient", "item", "text", "label", "display"];
      for (const k of prefer) {
        if (obj[k]) return String(obj[k]);
      }
      const qty = obj["quantity"] ?? obj["qty"] ?? obj["amount"] ?? null;
      const unit = obj["unit"] ?? obj["quantity_unit"] ?? "";
      const nm = obj["name"] ?? obj["ingredient"] ?? obj["item"] ?? null;
      if (nm) return `${qty ?? ""}${unit ? ` ${unit}` : ""} ${String(nm)}`.trim();
      // fallback: join primitive values
      const vals = Object.values(obj)
        .filter((v) => v != null)
        .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)));
      return vals.join(" ");
    }
    return String(item);
  }

  // jsonb or text[] — Supabase already deserialised to JS array
  if (Array.isArray(raw)) return raw.map((s) => stringifyIngredient(s).trim()).filter(Boolean);
  if (typeof raw !== "string") return [];

  // PostgreSQL array literal: {item1,"item 2",item3}
  if (raw.startsWith("{") && raw.endsWith("}")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  }

  // JSON string: ["item1","item2"] or array of objects
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((p) => stringifyIngredient(p).trim()).filter(Boolean);
  } catch {
    // plain comma-separated fallback
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return [];
}

export default function MealPlanPage() {
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [meals, setMeals] = useState<MealCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshUserData } = useUserData();

  async function fetchMeals() {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const date = getDateString(selectedOffset);
      const { data, error } = await supabase
        .from("meal_plans")
        .select("meal_type, recipe_name, description, ingredients, instructions, calories, cook_time, eaten, protein_g, fat_g, carbs_g")
        .eq("user_id", user.id)
        .eq("date", date)
        .in("meal_type", ["breakfast", "lunch", "dinner"]);

      if (error) throw error;

      const ORDER: DbMealType[] = ["breakfast", "lunch", "dinner"];
      const sorted = (data ?? []).sort(
        (a, b) => ORDER.indexOf(a.meal_type) - ORDER.indexOf(b.meal_type)
      );

      setMeals(
        sorted.map((row) => ({
          category: toCategory(row.meal_type as DbMealType),
          dishName: row.recipe_name ?? "",
          summary: row.description ?? "",
          ingredients: parseIngredients(row.ingredients),
          instructions: row.instructions ?? undefined,
          calories: row.calories != null ? Number(row.calories) : undefined,
          prepTime: row.cook_time != null ? Number(row.cook_time) : undefined,
          isEaten: row.eaten ?? false,
          meal_type: row.meal_type,
          // @ts-ignore — extra fields for onMarkEaten handler
          protein_g: row.protein_g ?? null,
          // @ts-ignore
          fat_g: row.fat_g ?? null,
          // @ts-ignore
          carbs_g: row.carbs_g ?? null,
        }))
      );
    } catch (err) {
      console.error("[MealPlanPage] fetch error", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMeals();
  }, [selectedOffset]);

  return (
    <div className="h-screen bg-[#f3f4f6] p-3 text-[#0d2e38]">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-2 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <NavbarUser />
        <main className="h-full overflow-y-auto rounded-3xl bg-[#eceef0] p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-6 pb-8">
            {/* Header */}
            <MealPlanHeader />

            {/* Weekly calendar — controlled */}
            <WeeklyCalendar
              selectedOffset={selectedOffset}
              onSelect={setSelectedOffset}
            />

            {/* Divider */}
            <div className="h-px w-full" style={{ background: "rgba(6,54,67,0.12)" }} />

            {/* Meal cards */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#063643] border-t-transparent" />
              </div>
            ) : meals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm font-bold" style={{ color: "#063643" }}>
                  No meals planned for this day
                </p>
                <p className="text-xs" style={{ color: "#7a9099" }}>
                  Add recipes from the Recipes page to build your plan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
                {meals.map((meal) => (
                  <div key={meal.category} className="w-full h-full">
                    <MealCard
                      {...meal}
                      onMarkEaten={async () => {
                        try {
                          const supabase = getSupabaseBrowserClient();
                          if (!supabase) return;
                          const {
                            data: { user },
                          } = await supabase.auth.getUser();
                          if (!user) return;
                          const date = getDateString(selectedOffset);
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-ignore
                          const mealType = meal.meal_type as string;

                          // Read macros + ingredients fresh from DB (not from potentially-stale React state)
                          const { data: freshRow } = await supabase
                            .from("meal_plans")
                            .select("calories, protein_g, fat_g, carbs_g, ingredients")
                            .eq("user_id", user.id)
                            .eq("date", date)
                            .eq("meal_type", mealType)
                            .single();

                          let mealProtein: number = freshRow?.protein_g ?? null;
                          let mealFat: number     = freshRow?.fat_g     ?? null;
                          let mealCarbs: number   = freshRow?.carbs_g   ?? null;
                          const mealCalories: number = freshRow?.calories ?? meal.calories ?? 0;

                          // If still null, fall back to user_generated_recipes blob
                          if (mealProtein == null || mealFat == null || mealCarbs == null) {
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
                              (r) => r.name?.toLowerCase().trim() === meal.dishName?.toLowerCase().trim()
                            );

                            mealProtein = (match?.protein_g != null ? Number(match.protein_g) : null) ?? 0;
                            mealFat     = (match?.fat_g     != null ? Number(match.fat_g)     : null) ?? 0;
                            mealCarbs   = (match?.carbs_g   != null ? Number(match.carbs_g)   : null) ?? 0;

                            if (match && (mealProtein > 0 || mealFat > 0 || mealCarbs > 0)) {
                              // Patch meal_plans row with resolved values for future lookups
                              await supabase
                                .from("meal_plans")
                                .update({ protein_g: mealProtein, fat_g: mealFat, carbs_g: mealCarbs })
                                .eq("user_id", user.id)
                                .eq("date", date)
                                .eq("meal_type", mealType);
                            }

                            if (mealProtein === 0 && mealFat === 0 && mealCarbs === 0) {
                              console.warn("[mark-eaten] macros could not be resolved — regenerate your recipes to get fresh macro data");
                            }
                          }

                          console.log("[mark-eaten] writing to daily_logs:", { mealCalories, mealProtein, mealFat, mealCarbs });

                          // Mark as eaten in meal_plans
                          const { error: eatErr } = await supabase
                            .from("meal_plans")
                            .update({ eaten: true })
                            .eq("user_id", user.id)
                            .eq("date", date)
                            .eq("meal_type", mealType);
                          if (eatErr) throw eatErr;

                          // Accumulate into daily_logs
                          const today = new Date().toLocaleDateString("en-CA");
                          await addToDailyLog(supabase, user.id, today, {
                            calories: mealCalories,
                            protein: mealProtein,
                            fat_g: mealFat,
                            carbs_g: mealCarbs,
                          });

                          // Deduct used ingredients from pantry
                          const ingredientStrings = parseIngredients(freshRow?.ingredients);
                          await deductIngredientsFromPantry(supabase, user.id, ingredientStrings);

                          refreshUserData();
                        } catch (err) {
                          console.error("[MealPlanPage] mark eaten error", err);
                        }
                      }}
                      onDelete={async () => {
                        try {
                          const supabase = getSupabaseBrowserClient();
                          if (!supabase) return;
                          const {
                            data: { user },
                          } = await supabase.auth.getUser();
                          if (!user) return;
                          const date = getDateString(selectedOffset);
                          // meal.meal_type was attached in fetchMeals (TS-ignore). Use any cast to access it.
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-ignore
                          const mealType = meal.meal_type as string;
                          const { error } = await supabase
                            .from("meal_plans")
                            .delete()
                            .eq("user_id", user.id)
                            .eq("date", date)
                            .eq("meal_type", mealType);
                          if (error) throw error;
                          await fetchMeals();
                        } catch (err) {
                          console.error("[MealPlanPage] delete error", err);
                          alert("Failed to delete meal. See console for details.");
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
        <UserStatBar />
      </div>
    </div>
  );
}

