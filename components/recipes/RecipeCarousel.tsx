"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, ChevronDown, Sparkles } from "lucide-react";
import FallbackImage from "@/components/ui/FallbackImage";
import type { MealType, Recipe, GeneratedRecipes } from "@/lib/recipes/types";
import AddToMealPlanModal from "@/components/recipes/AddToMealPlanModal";

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast Recipes" },
  { value: "lunch", label: "Lunch Recipes" },
  { value: "dinner", label: "Dinner Recipes" },
  { value: "snacks", label: "Snacks" },
];



function getCardStyle(offset: number): React.CSSProperties {
  const transition = "all 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  if (offset === 0) return { transform: "translateX(-50%) scale(1.12)", zIndex: 10, opacity: 1, transition, left: "50%", position: "absolute" };
  if (offset === -1) return { transform: "translateX(calc(-50% - 148px)) scale(0.83) rotateY(28deg)", zIndex: 8, opacity: 0.85, transition, left: "50%", position: "absolute" };
  if (offset === 1) return { transform: "translateX(calc(-50% + 148px)) scale(0.83) rotateY(-28deg)", zIndex: 8, opacity: 0.85, transition, left: "50%", position: "absolute" };
  if (offset <= -2) return { transform: "translateX(calc(-50% - 268px)) scale(0.68) rotateY(42deg)", zIndex: 5, opacity: 0.55, transition, left: "50%", position: "absolute" };
  return { transform: "translateX(calc(-50% + 268px)) scale(0.68) rotateY(-42deg)", zIndex: 5, opacity: 0.55, transition, left: "50%", position: "absolute" };
}

interface RecipeCarouselProps {
  /** AI-generated recipes. When null/undefined the static placeholder is shown. */
  generatedRecipes?: GeneratedRecipes | null;
  /** Renders a loading overlay while generation is in progress. */
  isLoading?: boolean;
}

export default function RecipeCarousel({
  generatedRecipes,
  isLoading = false,
}: RecipeCarouselProps) {
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(2);
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const source: GeneratedRecipes = generatedRecipes ?? { breakfast: [], lunch: [], dinner: [], snacks: [] };
  const recipes: Recipe[] = source[mealType];
  const currentLabel = MEAL_OPTIONS.find((o) => o.value === mealType)!.label;

  // Reset active card when meal type or source data changes
  useEffect(() => {
    setActiveIndex(recipes.length > 0 ? Math.min(2, recipes.length - 1) : 0);
  }, [mealType, generatedRecipes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectMeal = (value: MealType) => {
    setMealType(value);
    setActiveIndex(2);
    setDropdownOpen(false);
  };

  const prev = useCallback(() => setActiveIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setActiveIndex((i) => Math.min(recipes.length - 1, i + 1)), [recipes.length]);

  return (
    <>
    <div className="flex flex-col gap-4">
      {/* Section header: lines + dropdown label */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "#0d2e38" }} />
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold text-white transition-all duration-200 hover:opacity-90"
            style={{ background: "#063643" }}
          >
            {currentLabel}
            <ChevronDown
              size={14}
              strokeWidth={2.5}
              className="transition-transform duration-200"
              style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className="absolute left-1/2 top-full z-30 mt-2 w-48 overflow-hidden rounded-2xl bg-white shadow-xl"
              style={{
                transform: "translateX(-50%)",
                border: "1px solid rgba(6,54,67,0.1)",
              }}
            >
              {MEAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => selectMeal(opt.value)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors duration-150 hover:bg-[#f0f4f5]"
                  style={{
                    color: opt.value === mealType ? "#063643" : "#4b6068",
                    background: opt.value === mealType ? "#f0f4f5" : "transparent",
                  }}
                >
                  {opt.label}
                  {opt.value === mealType && (
                    <span className="h-2 w-2 rounded-full" style={{ background: "#063643" }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="h-px flex-1" style={{ background: "#0d2e38" }} />
      </div>

      {/* Coverflow carousel + loading overlay */}
      <div
        className="relative mt-4"
        style={{ height: 380, perspective: "1100px" }}
        aria-label="Recipe carousel"
      >
        {/* Loading overlay */}
        {isLoading && (
          <div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-3xl"
            style={{ background: "rgba(236,238,240,0.88)", backdropFilter: "blur(6px)" }}
          >
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#063643] border-t-transparent" />
            <p className="text-xs font-semibold" style={{ color: "#063643" }}>
              Crafting your recipes…
            </p>
          </div>
        )}

        {/* Empty state — shown before first generation */}
        {!isLoading && recipes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "rgba(6,54,67,0.08)" }}
            >
              <Sparkles size={28} style={{ color: "#063643" }} />
            </div>
            <div className="flex flex-col items-center gap-2 px-8 text-center">
              <p className="text-sm font-bold" style={{ color: "#063643" }}>
                No recipes yet
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#4b6068" }}>
                Hit{" "}
                <span className="font-extrabold" style={{ color: "#063643" }}>
                  Generate Recipes
                </span>{" "}
                above to discover meals tailored to your pantry
              </p>
            </div>
          </div>
        )}

        {recipes.map((recipe, index) => {
          const rawOffset = index - activeIndex;
          if (Math.abs(rawOffset) > 2) return null;
          const isActive = rawOffset === 0;

          return (
            <div
              key={recipe.id}
              style={getCardStyle(rawOffset)}
              className="w-[200px] cursor-pointer select-none"
              onClick={() => setActiveIndex(index)}
            >
              <div
                className="flex flex-col overflow-hidden rounded-3xl shadow-xl"
                style={{
                  background: isActive ? "#ffffff" : "#f0f3f5",
                  boxShadow: isActive
                    ? "0 20px 60px rgba(6,54,67,0.22), 0 4px 16px rgba(0,0,0,0.08)"
                    : "0 8px 24px rgba(0,0,0,0.1)",
                }}
              >
                {/* Food image */}
                <div className="relative h-[175px] w-full overflow-hidden bg-gray-100">
                  <div className="absolute inset-0 h-full w-full">
                    <FallbackImage src={recipe.image} alt={recipe.name} fill className="object-cover" />
                  </div>
                </div>

                {/* Card body */}
                <div className="flex flex-col gap-1.5 px-4 pb-4 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold" style={{ color: "#063643" }}>
                      {recipe.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">
                      {recipe.calories} cals
                    </span>
                  </div>

                  {isActive && (
                    <p className="text-[11px] leading-snug text-gray-500 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}

                  <button
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ background: "#063643" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("[RecipeCarousel] recipe sent to modal:", JSON.stringify(recipe, null, 2));
                      setModalRecipe(recipe);
                    }}
                  >
                    <Plus size={13} strokeWidth={3} />
                    Add to Meal Plan
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Prev arrow */}
        {recipes.length > 0 && (
          <button
            onClick={prev}
            disabled={activeIndex === 0}
            aria-label="Previous recipe"
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 transition-all duration-200 hover:scale-110 disabled:opacity-30"
            style={{ background: "rgba(6,54,67,0.12)" }}
          >
            <ChevronLeft size={20} style={{ color: "#063643" }} strokeWidth={2.5} />
          </button>
        )}

        {/* Next arrow */}
        {recipes.length > 0 && (
          <button
            onClick={next}
            disabled={activeIndex === recipes.length - 1}
            aria-label="Next recipe"
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 transition-all duration-200 hover:scale-110 disabled:opacity-30"
            style={{ background: "rgba(6,54,67,0.12)" }}
          >
            <ChevronRight size={20} style={{ color: "#063643" }} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {recipes.length > 0 && (
        <div className="flex justify-center gap-2">
          {recipes.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              aria-label={`Go to recipe ${i + 1}`}
              className="transition-all duration-300"
              style={{
                width: i === activeIndex ? 20 : 8,
                height: 8,
                borderRadius: 99,
                background: i === activeIndex ? "#063643" : "#c9d2d5",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>

    {/* Add-to-Meal-Plan modal */}
    {modalRecipe && (
      <AddToMealPlanModal
        recipe={modalRecipe}
        mealType={mealType}
        onClose={() => setModalRecipe(null)}
      />
    )}
    </>
  );
}

