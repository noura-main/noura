export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export interface Recipe {
  id: number;
  name: string;
  calories: number;
  description: string;
  image: string;
  /** Ordered list of ingredients with quantities, e.g. "2 cups of oats" */
  ingredients: string[];
  /** Step-by-step cooking instructions */
  instructions: string;
  /** Estimated cook/prep time in minutes */
  prepTime?: number;
  /** Macronutrients per serving (grams) */
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
}

export type GeneratedRecipes = Record<MealType, Recipe[]>;

export interface InventoryItem {
  name: string;
  quantity: number;
  quantity_unit: string;
}

/**
 * User dietary preferences.
 *
 * TODO: Replace MOCK_USER_PREFERENCES in the API route with a Supabase fetch
 *       once the `user_preferences` table exists. The shape below mirrors the
 *       planned DB schema so the swap is a one-liner.
 *
 * Future Supabase query:
 *   const { data } = await supabase
 *     .from("user_preferences")
 *     .select("diet, allergies, favorite_cuisines, calorie_goal")
 *     .eq("user_id", userId)
 *     .single();
 *   return {
 *     diet: data.diet,
 *     allergies: data.allergies ?? [],
 *     favoriteCuisines: data.favorite_cuisines ?? [],
 *     calorieGoal: data.calorie_goal ?? 2000,
 *   };
 */
export interface UserPreferences {
  /** e.g. "balanced" | "low-carb" | "vegetarian" | "high-protein" */
  diet: string;
  /** e.g. ["nuts", "shellfish", "dairy"] */
  allergies: string[];
  favoriteCuisines: string[];
  /** Daily calorie target in kcal */
  calorieGoal: number;
}
