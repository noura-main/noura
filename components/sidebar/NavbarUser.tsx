"use client";

import {
  ChefHat,
  FileText,
  Heart,
  MapPinned,
  SquareChartGantt,
  UtensilsCrossed,
  WalletCards,
  UserRound,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", icon: SquareChartGantt, href: "/dashboard" },
  { label: "My Kitchen", icon: ChefHat, href: "/mykitchen" },
  { label: "Recipes", icon: FileText, href: "/recipes" },
  { label: "Meal Plan", icon: UtensilsCrossed, href: "/mealplan" },
  { label: "Budget", icon: WalletCards, href: "/budget" },
  { label: "Preferences", icon: Heart, href: "/preferences" },
  { label: "Community", icon: MapPinned, href: "/community" },
];

export function NavbarUser() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="hidden h-full flex-col rounded-3xl bg-[#ffffff] p-5 text-white lg:flex">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl text-xs font-semibold uppercase tracking-wide m-2">
        <img
          src="/general/logo.png"
          alt="Noura"
          className="rounded-xl"
        />
      </div>

      <nav className="mt-6 space-y-1">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-md font-semibold transition ${
                active
                  ? "bg-[#063643] text-white"
                  : "text-[#8a8a8a] hover:bg-[#245e6e] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <Link
          href="/account"
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-md font-semibold text-[#8a8a8a] hover:text-white hover:bg-[#245e6e]"
        >
          <UserRound className="h-4 w-4" />
          My Account
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-md font-semibold text-[#8a8a8a] hover:text-white hover:bg-[#245e6e]"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
