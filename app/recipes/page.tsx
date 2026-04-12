"use client";

import { useState, useEffect } from "react";
import { NavbarUser } from "@/components/sidebar/NavbarUser";
import { UserStatBar } from "@/components/sidebar/UserStatBar";
import RecipeHero from "@/components/recipes/RecipeHero";
import RecipeCarousel from "@/components/recipes/RecipeCarousel";
import TrendingCategories, {
  TRENDING_CATEGORIES,
} from "@/components/recipes/TrendingCategories";
import GenerateButton from "@/components/recipes/GenerateButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { GeneratedRecipes, InventoryItem } from "@/lib/recipes/types";

export default function RecipesPage() {
  const [activeTrends, setActiveTrends] = useState<string[]>(["quick"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipes | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hydrate carousel with the user's last generated recipes on mount
  useEffect(() => {
    async function loadSaved() {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) return;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("user_generated_recipes")
          .select("recipes")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.recipes) {
          const saved = data.recipes as GeneratedRecipes;
          // Bust stale cache: if any recipe is missing ingredients/instructions, don't load it
          const firstRecipe = Object.values(saved).flat()[0] as (typeof saved)[keyof typeof saved][number] | undefined;
          const isStale = !firstRecipe || !Array.isArray(firstRecipe.ingredients) || firstRecipe.ingredients.length === 0;
          if (!isStale) {
            setGeneratedRecipes(saved);
          }
        }
      } catch {
        // No saved recipes or not signed in — first visit
      }
    }
    loadSaved();
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    // 1. Fetch user inventory from Supabase (failure is non-fatal)
    let inventory: InventoryItem[] = [];
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("user_ingredients")
            .select("name, quantity, quantity_unit")
            .eq("user_id", user.id);
          inventory = (data ?? []) as InventoryItem[];
        }
      }
    } catch {
      // Continue without inventory — AI will use pantry staples
    }

    // 2. Resolve human-readable labels for active trend chips (allow multiple)
    const trendLabels = TRENDING_CATEGORIES.filter((c) => activeTrends.includes(c.id)).map(
      (c) => c.label
    );
    const trendLabel = trendLabels.length ? trendLabels.join(", ") : "General";

    // 3. Call the generation API
    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory, activeTrend: trendLabel }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const { recipes } = await res.json();
      setGeneratedRecipes(recipes);

      // Persist for next visit (non-fatal — failure doesn't affect displayed recipes)
      try {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("user_generated_recipes").upsert(
              {
                user_id: user.id,
                recipes,
                trend: trendLabel,
                generated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );
          }
        }
      } catch {
        // Non-fatal
      }
    } catch (err) {
      console.error("[RecipesPage] generate error", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate recipes. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="h-screen bg-[#f3f4f6] p-3 text-[#0d2e38]">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-2 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <NavbarUser />
        <main className="h-full overflow-y-auto rounded-3xl bg-[#eceef0] p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-6 pb-8">
            <RecipeHero />

            <GenerateButton onClick={handleGenerate} isLoading={isGenerating} />

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <TrendingCategories active={activeTrends} onChange={setActiveTrends} />

            <RecipeCarousel generatedRecipes={generatedRecipes} isLoading={isGenerating} />
          </div>
        </main>
        <UserStatBar />
      </div>
    </div>
  );
}

