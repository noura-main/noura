import UserInfo from "@/components/dashboard/UserInfo";
import DailyTracking from "@/components/dashboard/DailyTracking";
import MealPlan from "@/components/dashboard/MealPlan";
import QuickSnackGen from "@/components/dashboard/QuickSnack"

import {
  ChefHat,
  FileText,
  Heart,
  MapPinned,
  Salad,
  Search,
  Settings,
  ShoppingBasket,
  Soup,
  SquareChartGantt,
  UserRound,
  UtensilsCrossed,
  WalletCards,
  Wheat,
  LogOut,
} from "lucide-react";

import NearbyFoodMapLoader from "@/components/dashboard/NearbyFoodMapLoader";
import { SmartTools } from "@/components/dashboard/SmartTools";

const navItems = [
  { label: "Dashboard", icon: SquareChartGantt, active: true },
  { label: "My Kitchen", icon: ChefHat },
  { label: "Recipes", icon: FileText },
  { label: "Meal Plan", icon: UtensilsCrossed },
  { label: "Budget", icon: WalletCards },
  { label: "Preferences", icon: Heart },
  { label: "Community", icon: MapPinned },
];

const meals = [
  { label: "Breakfast", detail: "breakfast", icon: Wheat },
  { label: "Lunch", detail: "lunch", icon: Salad },
  { label: "Dinner", detail: "dinner", icon: Soup },
];

export default function DashboardPage() {
  return (
    <div className="h-screen bg-[#f3f4f6] p-3 text-[#0d2e38]">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-2 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden h-full flex-col rounded-3xl bg-[#ffffff] p-5 text-white lg:flex">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl text-xs font-semibold uppercase tracking-wide m-2">
            <img
                src="/general/logo.png"
                alt="Noura"
                className="rounded-xl"
              />
            </div>

          <nav className="mt-6 space-y-1">
            {navItems.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-md font-semibold transition ${
                  active
                    ? "bg-[#063643] text-white"
                    : "text-[#8a8a8a] hover:bg-[#245e6e] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-md font-semibold text-[#8a8a8a] hover:text-white hover:bg-[#245e6e]"
            >
              <UserRound className="h-4 w-4" />
              My Account
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-md font-semibold text-[#8a8a8a] hover:text-white hover:bg-[#245e6e]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        <main className="h-full overflow-y-auto rounded-3xl bg-[#eceef0] p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-6">
            <section className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6a7f87]" />
                <input
                  type="text"
                  placeholder="Search ingredients, recipes..."
                  className="w-full rounded-2xl border border-[#d8dee2] bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#0d2e38]/30"
                />
              </div>
              <button
                type="button"
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d2e38] text-white"
              >
                <Settings className="h-5 w-5" />
              </button>
            </section>

            <section className="grid gap-4 rounded-3xl bg-[#063643] p-7 text-white md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h1 className="max-w-md text-5xl font-semibold leading-tight tracking-wide">
                  You&apos;ve Got Food.
                  <br />
                  We&apos;ve Got Plans.
                </h1>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0b4a5d] hover:cursor-pointer"
                  >
                    Generate Meals
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/70 px-5 py-2 text-sm font-semibold text-white hover:cursor-pointer"
                  >
                    View Recipes
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex h-44 w-64 items-center">
                <img
                  src="/dashboard/plate.png"
                  alt="Nutrional Plate"
                />
                </div>
              </div>
            </section>

            <hr className="mx-auto my-6 h-1 w-150 rounded border-0 bg-[#0d2e38]" />

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-3xl font-semibold">Smart Tools</h2>
              </div>
              <SmartTools />
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-3xl font-semibold">Nearby Foodspots</h2>
              </div>
              <NearbyFoodMapLoader />
            </section>
          </div>
        </main>

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
      </div>
    </div>
  );
}
