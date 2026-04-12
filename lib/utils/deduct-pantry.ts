import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Given a raw recipe ingredient string like "200g chicken breast" or "1 cup spinach",
 * strip the leading quantity + unit and return just the ingredient name.
 */
function extractIngredientName(raw: string): string {
  return raw
    .replace(
      /^[\d\/\.\s]+(g|kg|oz|lbs?|cups?|tbsp?|tsp?|ml|l|cloves?|slices?|pieces?|handfuls?|bunches?|cans?|jars?|packets?|stalks?|heads?|sprigs?|pinch(es)?|dash(es)?)?\s*/i,
      ""
    )
    .replace(/^(a|an|some)\s+/i, "")
    .trim()
    .toLowerCase();
}

/**
 * For each ingredient in a recipe, find the matching pantry item (user_ingredients) by
 * name and decrement its quantity by 1. Rows that reach 0 are deleted.
 *
 * This is a best-effort operation — failures are logged but never thrown so they
 * don't block the "mark as eaten" flow.
 */
export async function deductIngredientsFromPantry(
  supabase: SupabaseClient,
  userId: string,
  recipeIngredients: string[]
): Promise<void> {
  if (!recipeIngredients.length) return;

  try {
    // Fetch all pantry items once
    const { data: pantryItems, error: fetchErr } = await supabase
      .from("user_ingredients")
      .select("id, name, quantity")
      .eq("user_id", userId);

    if (fetchErr) {
      console.error("[deduct-pantry] fetch error", fetchErr);
      return;
    }
    if (!pantryItems?.length) return;

    // Build a lowercase name → row map for fast lookup
    const pantryMap = new Map(
      pantryItems.map((item) => [item.name.toLowerCase().trim(), item])
    );

    for (const raw of recipeIngredients) {
      const cleanedName = extractIngredientName(raw);
      if (!cleanedName) continue;

      // Try exact match first, then substring containment
      let matched = pantryMap.get(cleanedName);
      if (!matched) {
        for (const [pantryName, item] of pantryMap) {
          if (cleanedName.includes(pantryName) || pantryName.includes(cleanedName)) {
            matched = item;
            break;
          }
        }
      }

      if (!matched) continue;

      const newQty = (matched.quantity ?? 1) - 1;

      if (newQty <= 0) {
        const { error } = await supabase
          .from("user_ingredients")
          .delete()
          .eq("id", matched.id);
        if (error) console.error("[deduct-pantry] delete error for", matched.name, error);
        else console.log("[deduct-pantry] deleted (qty reached 0):", matched.name);
      } else {
        const { error } = await supabase
          .from("user_ingredients")
          .update({ quantity: newQty })
          .eq("id", matched.id);
        if (error) console.error("[deduct-pantry] update error for", matched.name, error);
        else console.log("[deduct-pantry] decremented:", matched.name, "→", newQty);
      }
    }
  } catch (err) {
    console.error("[deduct-pantry] unexpected error", err);
  }
}
