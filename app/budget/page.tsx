"use client";

import { useState } from "react";
import { NavbarUser } from "@/components/sidebar/NavbarUser";
import { UserStatBar } from "@/components/sidebar/UserStatBar";
import { BudgetHeader } from "@/components/budget/BudgetHeader";
import { BudgetOverviewCard } from "@/components/budget/BudgetOverviewCard";
import { SpendingOverviewChart } from "@/components/budget/SpendingOverviewChart";
import { RecentSpendingSection } from "@/components/budget/RecentSpendingSection";
import { SmartInsightsCard } from "@/components/budget/SmartInsightsCard";
import { LogPurchaseModal } from "@/components/budget/LogPurchaseModal";

export default function BudgetPage() {
  const [logOpen, setLogOpen] = useState(false);

  return (
    <div className="budget-shell h-screen bg-[#f3f4f6] p-3 text-[#0d2e38]">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-2 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <NavbarUser />

        <main className="h-full overflow-y-auto rounded-3xl bg-[#eceef0] p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto max-w-6xl space-y-6">
            <BudgetHeader />

            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
              <div className="flex flex-col gap-6 lg:col-span-5">
                <BudgetOverviewCard onLogPurchase={() => setLogOpen(true)} />
                <SpendingOverviewChart />
              </div>
              <div className="flex flex-col gap-6 lg:col-span-7">
                <RecentSpendingSection />
                <SmartInsightsCard />
              </div>
            </div>
          </div>
        </main>

        <UserStatBar />
      </div>

      <LogPurchaseModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}
