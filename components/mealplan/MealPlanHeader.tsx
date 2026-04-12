export default function MealPlanHeader() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#063643] px-8 py-10 text-white">
      <div className="max-w-[55%]">
        <h1 className="text-5xl font-bold leading-tight tracking-tight">
          Your Meal Plan:
        </h1>
        <p className="mt-1 text-4xl font-light leading-tight opacity-90">
          Recipes You'll Love Daily
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-0 right-6 flex items-end select-none">
        <img
          src="/mealplan/mealplan.png"
          alt="Meal plan illustration"
          className="h-48 w-72 object-contain object-bottom drop-shadow-2xl"
        />
      </div>
    </div>
  );
}
