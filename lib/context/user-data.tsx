"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface UserData {
  full_name: string | null;
  email: string | null;
  calories: number;
  protein: number;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  snack_name: string | null;
  snack_instructions: string | null;
  loading: boolean;
}

const defaultData: UserData = {
  full_name: null,
  email: null,
  calories: 0,
  protein: 0,
  breakfast: null,
  lunch: null,
  dinner: null,
  snack_name: null,
  snack_instructions: null,
  loading: true,
};

const UserDataContext = createContext<UserData>(defaultData);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<UserData>(defaultData);

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

        const [profileRes, dailyRes, mealsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single(),
          supabase
            .from("daily_logs")
            .select("calories,protein")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle(),
          supabase
            .from("meal_plans")
            .select("meal_type,recipe_name,instructions")
            .eq("user_id", user.id)
            .eq("date", today)
            .in("meal_type", ["breakfast", "lunch", "dinner", "snack"]),
        ]);

        const meals: Record<string, { recipe_name: string; instructions: string }> = {};
        for (const row of mealsRes.data ?? []) {
          meals[row.meal_type] = {
            recipe_name: row.recipe_name,
            instructions: row.instructions,
          };
        }

        setData({
          full_name: profileRes.data?.full_name ?? null,
          email: user.email ?? null,
          calories: dailyRes.data?.calories ?? 0,
          protein: dailyRes.data?.protein ?? 0,
          breakfast: meals.breakfast?.recipe_name ?? null,
          lunch: meals.lunch?.recipe_name ?? null,
          dinner: meals.dinner?.recipe_name ?? null,
          snack_name: meals.snack?.recipe_name ?? null,
          snack_instructions: meals.snack?.instructions ?? null,
          loading: false,
        });
      } catch (err) {
        console.error("Error fetching user data:", err);
        setData((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchAll();
  }, []);

  return (
    <UserDataContext.Provider value={data}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  return useContext(UserDataContext);
}
