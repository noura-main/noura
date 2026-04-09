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

const navItems = [
  { label: "Dashboard", icon: SquareChartGantt, active: true },
  { label: "My Kitchen", icon: ChefHat },
  { label: "Recipes", icon: FileText },
  { label: "Meal Plan", icon: UtensilsCrossed },
  { label: "Budget", icon: WalletCards },
  { label: "Preferences", icon: Heart },
  { label: "Community", icon: MapPinned },
];

export function NavbarUser() {
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
    );
}
