"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBudgetTransactions, useTransactionsForMonth } from "@/lib/context/budget-transactions";
import { isDateInCalendarMonth } from "@/lib/budget/dates";
import type { BudgetTransaction } from "@/lib/budget/types";

function buildSeries(
  transactions: BudgetTransaction[],
  year: number,
  monthIndex0: number,
  mode: "daily" | "cumulative"
) {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const inMonthTx = transactions.filter((t) => isDateInCalendarMonth(t.date, year, monthIndex0));
  const byDay = new Map<number, number>();
  for (const t of inMonthTx) {
    const day = Number(t.date.split("-")[2]);
    byDay.set(day, (byDay.get(day) ?? 0) + t.amount);
  }
  let cum = 0;
  const points: { day: string; daily: number; cumulative: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const daily = byDay.get(d) ?? 0;
    cum += daily;
    points.push({
      day: `${monthIndex0 + 1}/${d}`,
      daily,
      cumulative: cum,
    });
  }
  return points.map((p) => ({
    ...p,
    value: mode === "daily" ? p.daily : p.cumulative,
  }));
}

export function SpendingOverviewChart() {
  const { transactions } = useBudgetTransactions();
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => ({
    y: now.getFullYear(),
    m: now.getMonth(),
  }));
  const [mode, setMode] = useState<"daily" | "cumulative">("daily");

  const monthTx = useTransactionsForMonth(transactions, viewMonth.y, viewMonth.m);

  const data = useMemo(
    () => buildSeries(transactions, viewMonth.y, viewMonth.m, mode),
    [transactions, viewMonth.y, viewMonth.m, mode]
  );

  const thisMonth =
    viewMonth.y === now.getFullYear() && viewMonth.m === now.getMonth();

  function shiftMonth(delta: number) {
    setViewMonth((prev) => {
      const d = new Date(prev.y, prev.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <section
      id="spending-overview"
      className="rounded-3xl bg-[#063643] p-6 text-white shadow-sm scroll-mt-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Spending Overview</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg bg-white/10 px-2 py-1 text-xs font-medium hover:bg-white/20"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="text-sm font-medium tabular-nums">
            {new Date(viewMonth.y, viewMonth.m, 1).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={thisMonth}
            className="rounded-lg bg-white/10 px-2 py-1 text-xs font-medium hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next month"
          >
            →
          </button>
          <div className="ml-auto flex rounded-full bg-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setMode("daily")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                mode === "daily" ? "bg-white text-[#063643]" : "text-white/80"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setMode("cumulative")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                mode === "cumulative" ? "bg-white text-[#063643]" : "text-white/80"
              }`}
            >
              Cumulative
            </button>
          </div>
        </div>
      </div>

      <p className="mt-1 text-xs text-white/60">
        {monthTx.length} transaction{monthTx.length === 1 ? "" : "s"} this month (chart)
      </p>

      <div className="mt-4 h-56 w-full min-h-[14rem] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.12)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "#0D2D35",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              formatter={(value) => {
                const n = typeof value === "number" ? value : Number(value);
                return [
                  `$${Number.isFinite(n) ? n.toFixed(2) : "0"}`,
                  mode === "daily" ? "Spending" : "Total",
                ];
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#fef08a" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
