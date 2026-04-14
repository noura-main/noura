"use client";

import { ClipboardList, Plus } from "lucide-react";
import FallbackImage from "@/components/ui/FallbackImage";
import { useBudgetTransactions } from "@/lib/context/budget-transactions";
import { useReceiptScan } from "@/lib/context/receipt-scan";
import { formatUsd, monthYearLabel } from "@/lib/budget/format";

type Props = {
  onLogPurchase: () => void;
};

export function BudgetOverviewCard({ onLogPurchase }: Props) {
  const {
    weeklyBudgetCap,
    weeklySpentDone,
    remainingThisWeek,
    groceriesWeekDone,
    eatingOutWeekDone,
    setWeeklyBudgetCap,
  } = useBudgetTransactions();
  const { openReceiptScan } = useReceiptScan();

  const monthLabel = monthYearLabel(new Date());
  const overBudget = weeklySpentDone > weeklyBudgetCap;

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="bg-[#063643] px-6 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Weekly Budget</p>
        <p className={`mt-1 text-3xl font-bold tabular-nums ${overBudget ? "text-red-300" : ""}`}>
          {formatUsd(weeklySpentDone)} / {formatUsd(weeklyBudgetCap)}
        </p>
        <p className="mt-2 text-sm text-white/85">
          {formatUsd(remainingThisWeek)} left this week
        </p>
        {overBudget && (
          <p className="mt-2 text-sm font-semibold text-red-200">
            You&apos;ve exceeded your weekly budget...check out a smart insight to learn how to save next time!
          </p>
        )}
        <p className="mt-1 text-xs text-white/55">{monthLabel}</p>
      </div>

      <div className="grid gap-4 border-t border-[#eceef0] p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#0d2e38]/45">Spending Breakdown</p>
          <ul className="mt-3 space-y-2 text-sm font-medium text-[#0d2e38]">
            <li className="flex justify-between gap-4">
              <span>Groceries</span>
              <span className="tabular-nums">{formatUsd(groceriesWeekDone)}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>Eating Out</span>
              <span className="tabular-nums">{formatUsd(eatingOutWeekDone)}</span>
            </li>
          </ul>
        </div>
        <div className="flex justify-center md:justify-end">
          <div className="h-28 w-28 md:h-32 md:w-32">
            <FallbackImage
              src="/budget/takeout2.png"
              alt=""
              className="h-full w-full object-contain opacity-90"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[#eceef0] bg-[#f9fafb] px-4 py-4">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#0d2e38]/60">Weekly budget:</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={Number.isFinite(weeklyBudgetCap) ? String(weeklyBudgetCap) : ""}
              onChange={(e) => {
                const v = e.target.value === "" ? 0 : Number(e.target.value);
                if (Number.isFinite(v)) setWeeklyBudgetCap(v);
              }}
              className="w-28 rounded-xl border border-[#3d8489]/30 bg-white px-3 py-2 text-xs font-semibold text-[#0D2D35] outline-none focus:border-[#3D8489]"
              aria-label="Weekly budget amount"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => openReceiptScan()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#063643] px-3 py-2.5 text-xs font-semibold text-white min-[400px]:flex-none min-[400px]:px-4"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Scan Receipt
        </button>
        <button
          type="button"
          onClick={onLogPurchase}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#063643] px-3 py-2.5 text-xs font-semibold text-white min-[400px]:flex-none min-[400px]:px-4"
        >
          <ClipboardList className="h-4 w-4 shrink-0" />
          Log Purchase
        </button>
      </div>
    </div>
  );
}
