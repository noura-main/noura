"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface UserData {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  snack_name: string | null;
  snack_instructions: string | null;
  snack_description: string | null;
  snack_ingredients: string[] | null;
  snack_calories: number | null;
  snack_prep_time: number | null;
  snack_protein_g: number | null;
  snack_fat_g: number | null;
  snack_carbs_g: number | null;
  anyMealEaten: boolean;
  loading: boolean;
  refresh: () => void;
}

const defaultData: Omit<UserData, "refresh"> = {
  full_name: null,
  first_name: null,
  last_name: null,
  email: null,
  avatar_url: null,
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  breakfast: null,
  lunch: null,
  dinner: null,
  snack_name: null,
  snack_instructions: null,
  snack_description: null,
  snack_ingredients: null,
  snack_calories: null,
  snack_prep_time: null,
  snack_protein_g: null,
  snack_fat_g: null,
  snack_carbs_g: null,
  anyMealEaten: false,
  loading: true,
};

const UserDataContext = createContext<UserData>({ ...defaultData, refresh: () => {} });

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Omit<UserData, "refresh">>(defaultData);
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    async function fetchAll() {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setData({ ...defaultData, loading: false });
          return;
        }

        const today = new Date().toLocaleDateString("en-CA");

        const profileRes = await supabase
          .from("profiles")
          .select("first_name,last_name,full_name,avatar_url")
          .eq("id", user.id)
          .single();

        // Try enriched daily_logs (fat_g, carbs_g may not exist yet if migration not run)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let dailyData: any = null;
        const enrichedDailyRes = await supabase
          .from("daily_logs")
          .select("calories,protein,fat_g,carbs_g")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();
        if (enrichedDailyRes.error) {
          const fallbackDailyRes = await supabase
            .from("daily_logs")
            .select("calories,protein")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle();
          dailyData = fallbackDailyRes.data;
        } else {
          dailyData = enrichedDailyRes.data;
        }

        // Try enriched columns first; fall back to the minimal set if any column
        // doesn't exist yet (i.e. migration hasn't been applied).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let mealsData: any[] = [];
        const enrichedRes = await supabase
          .from("meal_plans")
          .select("meal_type,recipe_name,instructions,description,ingredients,calories,cook_time,protein_g,fat_g,carbs_g,eaten")
          .eq("user_id", user.id)
          .eq("date", today)
          .in("meal_type", ["breakfast", "lunch", "dinner", "snack"]);

        if (enrichedRes.error) {
          console.warn("[user-data] enriched meals query failed, falling back:", enrichedRes.error.message);
          const fallbackRes = await supabase
            .from("meal_plans")
            .select("meal_type,recipe_name,instructions")
            .eq("user_id", user.id)
            .eq("date", today)
            .in("meal_type", ["breakfast", "lunch", "dinner", "snack"]);
          mealsData = fallbackRes.data ?? [];
        } else {
          mealsData = enrichedRes.data ?? [];
        }

        const anyMealEaten = mealsData.some((row: { eaten?: boolean }) => row.eaten === true);

        const meals: Record<string, { recipe_name: string; instructions: string; description?: string; ingredients?: unknown; calories?: number | null; cook_time?: number | null; protein_g?: number | null; fat_g?: number | null; carbs_g?: number | null }> = {};
        for (const row of mealsData) {
          meals[row.meal_type] = {
            recipe_name: row.recipe_name,
            instructions: row.instructions,
            description: row.description,
            ingredients: row.ingredients,
            calories: row.calories,
            cook_time: row.cook_time,
            protein_g: row.protein_g ?? null,
            fat_g: row.fat_g ?? null,
            carbs_g: row.carbs_g ?? null,
          };
        }

        const p = profileRes.data ?? {};
        const first = p.first_name ?? null;
        const last = p.last_name ?? null;
        const computedFull = first || last ? `${(first ?? "").trim()} ${(last ?? "").trim()}`.trim() : (p.full_name ?? null);

        setData({
          full_name: computedFull,
          first_name: first,
          last_name: last,
          email: user.email ?? null,
          avatar_url: profileRes.data?.avatar_url ?? null,
          calories: dailyData?.calories ?? 0,
          protein: dailyData?.protein ?? 0,
          fat: dailyData?.fat_g ?? 0,
          carbs: dailyData?.carbs_g ?? 0,
          breakfast: meals.breakfast?.recipe_name ?? null,
          lunch: meals.lunch?.recipe_name ?? null,
          dinner: meals.dinner?.recipe_name ?? null,
          snack_name: meals.snack?.recipe_name ?? null,
          snack_instructions: meals.snack?.instructions ?? null,
          snack_description: meals.snack?.description ?? null,
          snack_ingredients: Array.isArray(meals.snack?.ingredients) ? (meals.snack.ingredients as string[]) : null,
          snack_calories: meals.snack?.calories ?? null,
          snack_prep_time: meals.snack?.cook_time ?? null,
          snack_protein_g: meals.snack?.protein_g ?? null,
          snack_fat_g: meals.snack?.fat_g ?? null,
          snack_carbs_g: meals.snack?.carbs_g ?? null,
          anyMealEaten,
          loading: false,
        });
      } catch (err) {
        console.error("Error fetching user data:", err);
        setData((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchAll();

    // Re-fetch when the tab becomes visible again so DB changes are picked up
    function onVisible() {
      if (document.visibilityState === "visible") fetchAll();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshKey]);

  return (
    <UserDataContext.Provider value={{ ...data, refresh }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  return useContext(UserDataContext);
}
