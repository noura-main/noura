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

/** Full user dietary preferences — mirrors the `user_preferences` table. */
export interface UserPreferences {
  /** Confirmed food allergies — must NEVER appear in any recipe. */
  allergies: string[];
  /** Active diet labels (e.g. "Vegan", "Keto") — ALL must be honoured. */
  diets: string[];
  /** Preferred cuisine styles — only generate recipes from these cuisines (if non-empty). */
  cuisines: string[];
  /** If true, allow modern fusion twists; if false, keep recipes traditional. */
  fusionMode: boolean;
  /** 0 = Mild, 1 = Gentle, 2 = Medium, 3 = Hot, 4 = Extra Hot */
  spiceLevel: number;
  /** Specific ingredients the user refuses — must NEVER appear in any recipe. */
  noGoItems: string[];
  /** Kitchen equipment available — only use cooking methods that work with these. */
  equipment: string[];
  /** Cooking skill level of the user. */
  skillLevel: "beginner" | "intermediate" | "advanced";
}
