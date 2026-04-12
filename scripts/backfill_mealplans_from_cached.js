/*
  Backfill missing image/instructions/macros in meal_plans from user_generated_recipes.

  Usage:
    SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_KEY=your_service_role_key node scripts/backfill_mealplans_from_cached.js

  This script requires a Supabase service role key (DO NOT commit this key).
*/

import('node:process').then(() => {});
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env var.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  console.log('[backfill] fetching meal_plans rows with missing fields...');

  const { data: rows, error: fetchErr } = await supabase
    .from('meal_plans')
    .select('id, user_id, date, meal_type, recipe_name, instructions, image, protein_g, fat_g, carbs_g')
    .or('instructions.is.null,image.is.null,protein_g.is.null,fat_g.is.null,carbs_g.is.null')
    .limit(1000);

  if (fetchErr) {
    console.error('[backfill] fetch error', fetchErr);
    process.exit(1);
  }

  console.log(`[backfill] found ${rows.length} candidate rows`);

  let updated = 0;
  for (const row of rows) {
    const name = (row.recipe_name || '').trim();
    if (!name) continue;

    // Try to find the most recent cached generated recipe for this user with matching name
    const { data: cached, error: cacheErr } = await supabase
      .from('user_generated_recipes')
      .select('id, name, description, ingredients, instructions, image, protein_g, fat_g, carbs_g')
      .eq('user_id', row.user_id)
      .ilike('name', name)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cacheErr) {
      console.warn('[backfill] cache lookup error for', name, cacheErr.message || cacheErr);
      continue;
    }

    const cachedRecipe = Array.isArray(cached) ? cached[0] : cached;
    if (!cachedRecipe) {
      console.log('[backfill] no cached recipe found for', name);
      continue;
    }

    const updatePayload = {};
    if (!row.instructions && cachedRecipe.instructions) updatePayload.instructions = cachedRecipe.instructions;
    if (!row.image && cachedRecipe.image) updatePayload.image = cachedRecipe.image;
    if ((row.protein_g == null || row.protein_g === '') && cachedRecipe.protein_g != null) updatePayload.protein_g = cachedRecipe.protein_g;
    if ((row.fat_g == null || row.fat_g === '') && cachedRecipe.fat_g != null) updatePayload.fat_g = cachedRecipe.fat_g;
    if ((row.carbs_g == null || row.carbs_g === '') && cachedRecipe.carbs_g != null) updatePayload.carbs_g = cachedRecipe.carbs_g;

    if (Object.keys(updatePayload).length === 0) {
      console.log('[backfill] nothing to update for', name);
      continue;
    }

    const { error: upErr } = await supabase
      .from('meal_plans')
      .update(updatePayload)
      .eq('id', row.id);

    if (upErr) {
      console.error('[backfill] failed to update', row.id, upErr.message || upErr);
    } else {
      updated += 1;
      console.log('[backfill] updated', row.id, Object.keys(updatePayload));
    }
  }

  console.log(`[backfill] complete — updated ${updated} rows`);
}

main().catch((err) => {
  console.error('[backfill] unexpected error', err);
  process.exit(1);
});
