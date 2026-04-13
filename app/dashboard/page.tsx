"use client"
import { useRouter } from "next/navigation";

import { NavbarUser } from "@/components/sidebar/NavbarUser";
import { UserStatBar } from "@/components/sidebar/UserStatBar";

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
} from "lucide-react";

import NearbyFoodMapLoader from "@/components/dashboard/NearbyFoodMapLoader";
import { SmartTools } from "@/components/dashboard/SmartTools";
import FallbackImage from "@/components/ui/FallbackImage";

export default function DashboardPage() {
  const router = useRouter();
  
  return (
    <div className="h-screen bg-[#f3f4f6] p-3 text-[#0d2e38]">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-2 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <NavbarUser />

        <main className="h-full overflow-y-auto rounded-3xl bg-[#eceef0] p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-6">
            <section className="grid gap-4 rounded-3xl bg-[#063643] p-7 text-white md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h1 className="max-w-md text-5xl font-semibold leading-tight tracking-wide">
                  You&apos;ve Got Food.
                  <br />
                  We&apos;ve Got Plans.
                </h1>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push('/mealplan')}
                    type="button"
                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0b4a5d] hover:cursor-pointer"
                  >
                    Generate Meals
                  </button>
                  <button
                    onClick={() => router.push('/recipes')}
                    type="button"
                    className="rounded-full border border-white/70 px-5 py-2 text-sm font-semibold text-white hover:cursor-pointer"
                  >
                    View Recipes
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex h-44 w-64 items-center">
                <FallbackImage src="/dashboard/plate.png" alt="Nutrional Plate" className="h-auto w-full object-contain" />
                </div>
              </div>
            </section>

            <hr className="mx-auto my-6 h-1 w-150 rounded border-0 bg-[#0d2e38]" />

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-3xl font-semibold">Quick Tools</h2>
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

        <UserStatBar />
      </div>
    </div>
  );
}
