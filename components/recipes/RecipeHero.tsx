"use client";

interface RecipeHeroProps {
  onGenerate?: () => void;
}

export default function RecipeHero({ onGenerate }: RecipeHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#063643] px-8 py-10 text-white">
      {/* Text — left column */}
      <div className="max-w-[55%]">
        <h1 className="text-5xl font-semibold leading-tight tracking-wider">
           Recipes Made Just for You
        </h1>

        {/* Intentionally no CTA here — button is placed below the hero in the page layout */}
      </div>

      {/* Illustration — absolute bottom-right, same pattern as My Kitchen */}
      <div className="pointer-events-none absolute bottom-0 right-6 flex items-end select-none">
        <img
          src="/recipes/recipes.png"
          alt="Cooking illustration"
          className="h-48 w-72 object-contain object-bottom drop-shadow-2xl"
        />
      </div>
    </div>
  );
}
