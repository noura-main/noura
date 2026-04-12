import type { SupabaseClient } from "@supabase/supabase-js";

interface NutritionDelta {
  calories: number;
  protein: number;
  fat_g?: number;
  carbs_g?: number;
}

/**
 * Adds nutrition values to a user's daily_log row for the given date.
 */
export async function addToDailyLog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  date: string,
  delta: NutritionDelta
): Promise<void> {
  console.log("[daily-log] addToDailyLog called with delta:", JSON.stringify(delta));

  // Step 1: read existing row using only base columns (always exist)
  const { data: baseRows, error: baseReadErr } = await supabase
    .from("daily_logs")
    .select("calories, protein")
    .eq("user_id", userId)
    .eq("date", date)
    .limit(1);

  if (baseReadErr) {
    console.error("[daily-log] base read error:", baseReadErr.message);
    return;
  }

  // Step 2: also try reading macro columns separately to see if they exist
  const { data: macroRows, error: macroReadErr } = await supabase
    .from("daily_logs")
    .select("fat_g, carbs_g")
    .eq("user_id", userId)
    .eq("date", date)
    .limit(1);

  const macroColumnsExist = !macroReadErr;
  if (macroReadErr) {
    console.warn("[daily-log] macro columns not found in daily_logs (migration not run?):", macroReadErr.message);
  }

  console.log("[daily-log] existing base row:", JSON.stringify(baseRows?.[0] ?? null));
  console.log("[daily-log] existing macros:", macroColumnsExist ? JSON.stringify(macroRows?.[0] ?? null) : "columns missing");

  const existingBase = baseRows?.[0] ?? null;
  const existingMacros = macroRows?.[0] ?? null;

  const newCalories = (existingBase?.calories ?? 0) + delta.calories;
  const newProtein  = (existingBase?.protein  ?? 0) + delta.protein;
  const newFat      = (existingMacros?.fat_g  ?? 0) + (delta.fat_g   ?? 0);
  const newCarbs    = (existingMacros?.carbs_g ?? 0) + (delta.carbs_g ?? 0);

  console.log("[daily-log] computed new values:", { newCalories, newProtein, newFat, newCarbs });

  if (existingBase) {
    // Update base columns
    const { error: baseUpdateErr } = await supabase
      .from("daily_logs")
      .update({ calories: newCalories, protein: newProtein })
      .eq("user_id", userId)
      .eq("date", date);

    if (baseUpdateErr) {
      console.error("[daily-log] base update failed:", baseUpdateErr.message);
    } else {
      console.log("[daily-log] base update OK (calories, protein)");
    }

    // Update macro columns separately (safe to fail if migration not run)
    if (macroColumnsExist) {
      const { error: macroUpdateErr } = await supabase
        .from("daily_logs")
        .update({ fat_g: newFat, carbs_g: newCarbs })
        .eq("user_id", userId)
        .eq("date", date);

      if (macroUpdateErr) {
        console.error("[daily-log] macro update failed:", macroUpdateErr.message);
      } else {
        console.log("[daily-log] macro update OK (fat_g, carbs_g):", { newFat, newCarbs });
      }
    }
  } else {
    // Insert base columns
    const { error: insertErr } = await supabase
      .from("daily_logs")
      .insert({ user_id: userId, date, calories: newCalories, protein: newProtein });

    if (insertErr) {
      console.error("[daily-log] insert failed:", insertErr.message);
      return;
    }
    console.log("[daily-log] insert OK (calories, protein)");

    // Now update macro columns on the freshly inserted row
    if (macroColumnsExist) {
      const { error: macroUpdateErr } = await supabase
        .from("daily_logs")
        .update({ fat_g: newFat, carbs_g: newCarbs })
        .eq("user_id", userId)
        .eq("date", date);

      if (macroUpdateErr) {
        console.error("[daily-log] macro update after insert failed:", macroUpdateErr.message);
      } else {
        console.log("[daily-log] macro update after insert OK:", { newFat, newCarbs });
      }
    }
  }
}
