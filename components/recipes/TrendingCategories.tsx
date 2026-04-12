"use client";

export const TRENDING_CATEGORIES = [
  { label: "Quick & Easy", id: "quick" },
  { label: "High Protein", id: "protein" },
  { label: "Under 30 Min", id: "30min" },
  { label: "Vegetarian", id: "vegetarian" },
  { label: "Low Calorie", id: "lowcal" },
  { label: "Meal Prep", id: "mealprep" },
  { label: "Budget-Friendly", id: "budget" },
  { label: "Family Friendly", id: "family" },
  { label: "Gluten-Free", id: "glutenfree" },
];

interface TrendingCategoriesProps {
  active: string[];
  onChange: (ids: string[]) => void;
}

export default function TrendingCategories({ active, onChange }: TrendingCategoriesProps) {
  const toggle = (id: string) => {
    const next = active.includes(id) ? active.filter((a) => a !== id) : [...active, id];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8fa3ab" }}>
        Trending
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {TRENDING_CATEGORIES.map((cat) => {
          const isActive = active.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              aria-pressed={isActive}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: isActive ? "#063643" : "#eceef0",
                color: isActive ? "#ffffff" : "#4b6068",
                boxShadow: isActive ? "0 4px 12px rgba(6,54,67,0.25)" : "none",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
