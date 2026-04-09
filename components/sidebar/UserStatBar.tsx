import UserInfo from "@/components/dashboard/UserInfo";
import DailyTracking from "@/components/dashboard/DailyTracking";
import MealPlan from "@/components/dashboard/MealPlan";
import QuickSnackGen from "@/components/dashboard/QuickSnack"

import {
  Salad,
  Soup,
  Wheat,
  ShoppingBasket,
  UserRound
} from "lucide-react";

const meals = [
  { label: "Breakfast", detail: "breakfast", icon: Wheat },
  { label: "Lunch", detail: "lunch", icon: Salad },
  { label: "Dinner", detail: "dinner", icon: Soup },
];

export function UserStatBar() {
  return(
    <aside className="hidden h-full flex-col rounded-3xl border border-[#e0e5e9] bg-white p-5 lg:flex">
          <header className="flex items-start justify-between border-b border-[#edf1f4] pb-4">
            <div>
              <p className="text-2xl font-semibold">
                Hello, <UserInfo field="full_name" /> !!
              </p>
              <p className="text-sm text-[#6a7f87]">
                <UserInfo field="email" />
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f4f6]">
              <UserRound className="h-6 w-6 text-[#0d2e38]" />
            </div>
          </header>

          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Nutrition</h3>
              <span className="text-[#8aa0a8]">...</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-2xl bg-[#0d2e38] p-3 text-white">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/75">
                    Calories
                  </p>
                </div>
                <p className="text-4xl font-semibold leading-none">
                  <DailyTracking field="calories"/>
                </p>
                <p className="mt-1 text-sm text-white/80">Today</p>
              </article>
              <article className="rounded-2xl border border-[#e5eaed] bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-[#7f9199]">
                    Protein
                  </p>
                </div>
                <p className="text-4xl font-semibold leading-none text-[#0d2e38]">
                  <DailyTracking field="protein"/>g
                </p>
                <p className="mt-1 text-sm text-[#6a7f87]">Today</p>
              </article>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Today&apos;s Plan</h3>
              <span className="text-[#8aa0a8]">...</span>
            </div>
            <div className="space-y-2">
              {meals.map((meal) => (
                <article
                  key={meal.label}
                  className="flex items-center gap-3 rounded-2xl border border-[#e8edf0] bg-[#f8fafb] p-3"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#dceef1] text-[#0b4a5d]">
                    <meal.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{meal.label}</p>
                    <p className="text-sm text-[#6a7f87]">
                    <MealPlan 
                      field={meal.detail as 'breakfast' | 'lunch' | 'dinner'} 
                    />
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-auto rounded-2xl bg-[#0d2e38] p-4 text-white">
            <h3 className="text-lg font-semibold">Quick Snack</h3>
            <article className="mt-3 rounded-2xl bg-white/10 p-3">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <ShoppingBasket className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">
                    <QuickSnackGen field="recipe_name"/>
                  </p>
                  <p className="text-sm text-white/80">
                  <QuickSnackGen field="instructions"/>
                  </p>
                </div>
              </div>
            </article>
          </section>
        </aside>
  );
}
