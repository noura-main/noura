"use client";

import { useState, useEffect, useMemo } from "react";
import { NavbarUser } from "@/components/sidebar/NavbarUser";
import { UserStatBar } from "@/components/sidebar/UserStatBar";
import RecipeHero from "@/components/recipes/RecipeHero";
import RecipeCarousel from "@/components/recipes/RecipeCarousel";
import TrendingCategories, {
  TRENDING_CATEGORIES,
} from "@/components/recipes/TrendingCategories";
import GenerateButton from "@/components/recipes/GenerateButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { GeneratedRecipes, InventoryItem, UserPreferences } from "@/lib/recipes/types";

export default function RecipesPage() {
  const [activeTrends, setActiveTrends] = useState<string[]>(["quick"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipes | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trendLabel = useMemo(() => {
    const trendLabels = TRENDING_CATEGORIES.filter((c) => activeTrends.includes(c.id)).map((c) => c.label);
    return trendLabels.length ? trendLabels.join(", ") : "General";
  }, [activeTrends]);

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

    // 1. Fetch user inventory + preferences from Supabase (failures are non-fatal)
    let inventory: InventoryItem[] = [];
    let preferences: UserPreferences | null = null;
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const [inventoryRes, prefsRes] = await Promise.all([
            supabase
              .from("user_ingredients")
              .select("name, quantity, quantity_unit")
              .eq("user_id", user.id),
            supabase
              .from("user_preferences")
              .select("allergies,diets,cuisines,fusion_mode,spice_level,no_go_items,equipment,skill_level")
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);
          inventory = (inventoryRes.data ?? []) as InventoryItem[];
          if (prefsRes.data) {
            const p = prefsRes.data;
            preferences = {
              allergies:  p.allergies  ?? [],
              diets:      p.diets      ?? [],
              cuisines:   p.cuisines   ?? [],
              fusionMode: p.fusion_mode ?? false,
              spiceLevel: p.spice_level ?? 2,
              noGoItems:  p.no_go_items ?? [],
              equipment:  p.equipment  ?? [],
              skillLevel: p.skill_level ?? "intermediate",
            };
          }
        }
      }
    } catch {
      // Continue without inventory/preferences — AI will use defaults
    }

    // (trendLabel computed via useMemo)

    // 3. Call the generation API (background job + polling)
    try {
      const start = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory, activeTrend: trendLabel, preferences, specialInstructions, background: true }),
      });

      if (start.status === 200) {
        const body = await start.json();
        setGeneratedRecipes(body.recipes);
      } else if (start.status === 202) {
        const { jobId } = await start.json();
        // poll for completion
        const timeoutMs = 60_000;
        const startTs = Date.now();
        while (Date.now() - startTs < timeoutMs) {
          await new Promise((r) => setTimeout(r, 1500));
          const statusRes = await fetch(`/api/recipes/generate?jobId=${jobId}`);
          if (!statusRes.ok) {
            const errBody = await statusRes.json().catch(() => ({}));
            throw new Error(errBody?.error ?? `Job status fetch failed (${statusRes.status})`);
          }
          const statusBody = await statusRes.json();
          if (statusBody.status === "done") {
            setGeneratedRecipes(statusBody.result);
            break;
          }
          if (statusBody.status === "failed") {
            throw new Error(statusBody.error || "Generation failed");
          }
        }
      } else {
        const body = await start.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${start.status})`);
      }

      // Persist for next visit (non-fatal — failure doesn't affect displayed recipes)
      try {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user && generatedRecipes) {
            await supabase.from("user_generated_recipes").upsert(
              {
                user_id: user.id,
                recipes: generatedRecipes,
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

  // Regenerate a single meal (replace its recipes)
  async function handleRegenerateMeal(meal: string) {
    setIsGenerating(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      let inventory: InventoryItem[] = [];
      let preferences: UserPreferences | null = null;
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const [inventoryRes, prefsRes] = await Promise.all([
            supabase
              .from("user_ingredients")
              .select("name, quantity, quantity_unit")
              .eq("user_id", user.id),
            supabase
              .from("user_preferences")
              .select("allergies,diets,cuisines,fusion_mode,spice_level,no_go_items,equipment,skill_level")
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);
          inventory = (inventoryRes.data ?? []) as InventoryItem[];
          if (prefsRes.data) {
            const p = prefsRes.data;
            preferences = {
              allergies:  p.allergies  ?? [],
              diets:      p.diets      ?? [],
              cuisines:   p.cuisines   ?? [],
              fusionMode: p.fusion_mode ?? false,
              spiceLevel: p.spice_level ?? 2,
              noGoItems:  p.no_go_items ?? [],
              equipment:  p.equipment  ?? [],
              skillLevel: p.skill_level ?? "intermediate",
            };
          }
        }
      }

      const start = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory, activeTrend: trendLabel, preferences, specialInstructions, mealTypes: [meal], count: 5, background: true }),
      });

      if (start.status === 200) {
        const body = await start.json();
        setGeneratedRecipes((prev) => ({ ...(prev ?? { breakfast: [], lunch: [], dinner: [], snacks: [] }), ...body.recipes }));
      } else if (start.status === 202) {
        const { jobId } = await start.json();
        const timeoutMs = 60_000;
        const startTs = Date.now();
        while (Date.now() - startTs < timeoutMs) {
          await new Promise((r) => setTimeout(r, 1500));
          const statusRes = await fetch(`/api/recipes/generate?jobId=${jobId}`);
          const statusBody = await statusRes.json();
          if (statusBody.status === "done") {
            setGeneratedRecipes((prev) => ({ ...(prev ?? { breakfast: [], lunch: [], dinner: [], snacks: [] }), ...statusBody.result }));
            break;
          }
          if (statusBody.status === "failed") {
            throw new Error(statusBody.error || "Generation failed");
          }
        }
      }
    } catch (err) {
      console.error("[RecipesPage] regenerate meal error", err);
      setError(err instanceof Error ? err.message : "Failed to regenerate meal");
    } finally {
      setIsGenerating(false);
    }
  }

  // Regenerate one specific recipe card (replace single recipe at index)
  async function handleRegenerateRecipe(meal: string, index: number) {
    setIsGenerating(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      let inventory: InventoryItem[] = [];
      let preferences: UserPreferences | null = null;
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const [inventoryRes, prefsRes] = await Promise.all([
            supabase
              .from("user_ingredients")
              .select("name, quantity, quantity_unit")
              .eq("user_id", user.id),
            supabase
              .from("user_preferences")
              .select("allergies,diets,cuisines,fusion_mode,spice_level,no_go_items,equipment,skill_level")
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);
          inventory = (inventoryRes.data ?? []) as InventoryItem[];
          if (prefsRes.data) {
            const p = prefsRes.data;
            preferences = {
              allergies:  p.allergies  ?? [],
              diets:      p.diets      ?? [],
              cuisines:   p.cuisines   ?? [],
              fusionMode: p.fusion_mode ?? false,
              spiceLevel: p.spice_level ?? 2,
              noGoItems:  p.no_go_items ?? [],
              equipment:  p.equipment  ?? [],
              skillLevel: p.skill_level ?? "intermediate",
            };
          }
        }
      }

      const start = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory, activeTrend: trendLabel, preferences, specialInstructions, mealTypes: [meal], count: 1, background: true }),
      });

      if (start.status === 200) {
        const body = await start.json();
        const incoming = body.recipes ?? {};
        const newRecipe = (incoming[meal as keyof GeneratedRecipes] ?? [])[0];
        if (!newRecipe) throw new Error("No recipe returned");
        setGeneratedRecipes((prev) => {
          const base = prev ?? { breakfast: [], lunch: [], dinner: [], snacks: [] };
          const list = [...(base[meal as keyof GeneratedRecipes] ?? [])];
          if (index >= 0 && index < list.length) {
            list[index] = { ...newRecipe, id: list[index].id ?? index + 1 } as any;
          } else {
            list.push({ ...newRecipe, id: list.length + 1 } as any);
          }
          return { ...base, [meal]: list } as GeneratedRecipes;
        });
      } else if (start.status === 202) {
        const { jobId } = await start.json();
        const timeoutMs = 60_000;
        const startTs = Date.now();
        while (Date.now() - startTs < timeoutMs) {
          await new Promise((r) => setTimeout(r, 1500));
          const statusRes = await fetch(`/api/recipes/generate?jobId=${jobId}`);
          if (!statusRes.ok) {
            const errBody = await statusRes.json().catch(() => ({}));
            throw new Error(errBody?.error ?? `Job status fetch failed (${statusRes.status})`);
          }
          const statusBody = await statusRes.json();
          if (statusBody.status === "done") {
            const incoming = statusBody.result ?? {};
            const newRecipe = (incoming[meal as keyof GeneratedRecipes] ?? [])[0];
            if (!newRecipe) throw new Error("No recipe returned");
            setGeneratedRecipes((prev) => {
              const base = prev ?? { breakfast: [], lunch: [], dinner: [], snacks: [] };
              const list = [...(base[meal as keyof GeneratedRecipes] ?? [])];
              if (index >= 0 && index < list.length) {
                list[index] = { ...newRecipe, id: list[index].id ?? index + 1 } as any;
              } else {
                list.push({ ...newRecipe, id: list.length + 1 } as any);
              }
              return { ...base, [meal]: list } as GeneratedRecipes;
            });
            break;
          }
          if (statusBody.status === "failed") {
            throw new Error(statusBody.error || "Generation failed");
          }
        }
      }
    } catch (err) {
      console.error("[RecipesPage] regenerate single recipe error", err);
      setError(err instanceof Error ? err.message : "Failed to regenerate recipe");
    } finally {
      setIsGenerating(false);
    }
  }

  // Append one new recipe for a meal
  async function handleGenerateMore(meal: string) {
    setIsGenerating(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      let inventory: InventoryItem[] = [];
      let preferences: UserPreferences | null = null;
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const [inventoryRes, prefsRes] = await Promise.all([
            supabase
              .from("user_ingredients")
              .select("name, quantity, quantity_unit")
              .eq("user_id", user.id),
            supabase
              .from("user_preferences")
              .select("allergies,diets,cuisines,fusion_mode,spice_level,no_go_items,equipment,skill_level")
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);
          inventory = (inventoryRes.data ?? []) as InventoryItem[];
          if (prefsRes.data) {
            const p = prefsRes.data;
            preferences = {
              allergies:  p.allergies  ?? [],
              diets:      p.diets      ?? [],
              cuisines:   p.cuisines   ?? [],
              fusionMode: p.fusion_mode ?? false,
              spiceLevel: p.spice_level ?? 2,
              noGoItems:  p.no_go_items ?? [],
              equipment:  p.equipment  ?? [],
              skillLevel: p.skill_level ?? "intermediate",
            };
          }
        }
      }

      const start = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory, activeTrend: trendLabel, preferences, specialInstructions, mealTypes: [meal], count: 1, background: true }),
      });

      if (start.status === 200) {
        const body = await start.json();
        setGeneratedRecipes((prev) => {
          const base = prev ?? { breakfast: [], lunch: [], dinner: [], snacks: [] };
          const incoming = body.recipes ?? {};
          const existing = base[meal as keyof GeneratedRecipes] ?? [];
          const appended = (incoming[meal as keyof GeneratedRecipes] ?? []).map((r: any, i: number) => ({ ...r, id: existing.length + i + 1 }));
          return { ...base, [meal]: [...existing, ...appended] } as GeneratedRecipes;
        });
      } else if (start.status === 202) {
        const { jobId } = await start.json();
        const timeoutMs = 60_000;
        const startTs = Date.now();
        while (Date.now() - startTs < timeoutMs) {
          await new Promise((r) => setTimeout(r, 1500));
          const statusRes = await fetch(`/api/recipes/generate?jobId=${jobId}`);
          const statusBody = await statusRes.json();
          if (statusBody.status === "done") {
            setGeneratedRecipes((prev) => {
              const base = prev ?? { breakfast: [], lunch: [], dinner: [], snacks: [] };
              const incoming = statusBody.result ?? {};
              const existing = base[meal as keyof GeneratedRecipes] ?? [];
              const appended = (incoming[meal as keyof GeneratedRecipes] ?? []).map((r: any, i: number) => ({ ...r, id: existing.length + i + 1 }));
              return { ...base, [meal]: [...existing, ...appended] } as GeneratedRecipes;
            });
            break;
          }
          if (statusBody.status === "failed") {
            throw new Error(statusBody.error || "Generation failed");
          }
        }
      }
    } catch (err) {
      console.error("[RecipesPage] generate more error", err);
      setError(err instanceof Error ? err.message : "Failed to generate more recipes");
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

            <div>
              <label className="text-sm font-medium text-[#0d2e38]">Special Instructions</label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="E.g. No dairy, avoid frying, low salt, use olive oil only..."
                className="mt-1 w-full min-h-[80px] rounded-2xl border border-[#e6eded] bg-white p-3 text-sm text-[#0d2e38] outline-none"
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <TrendingCategories active={activeTrends} onChange={setActiveTrends} />

            <RecipeCarousel
              generatedRecipes={generatedRecipes}
              isLoading={isGenerating}
              onRegenerateMeal={handleRegenerateMeal}
              onRegenerateRecipe={handleRegenerateRecipe}
              onGenerateMore={handleGenerateMore}
            />
          </div>
        </main>
        <UserStatBar />
      </div>
    </div>
  );
}

