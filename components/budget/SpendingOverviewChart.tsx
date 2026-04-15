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
import { useBudgetTransactions } from "@/lib/context/budget-transactions";
import { isDateInCalendarMonth } from "@/lib/budget/dates";
import type { BudgetTransaction } from "@/lib/budget/types";

function buildSeries(
  transactions: BudgetTransaction[],
  year: number,
  monthIndex0: number,
  mode: "daily" | "cumulative"
) {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  // Ensure we are filtering based on the date string from the DB
  const inMonthTx = transactions.filter((t) => isDateInCalendarMonth(t.date, year, monthIndex0));
  
  const byDay = new Map<number, number>();
  for (const t of inMonthTx) {
    // Assuming date format YYYY-MM-DD
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
  // Pull loading state from our new context
  const { transactions, loading } = useBudgetTransactions();
  
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => ({
    y: now.getFullYear(),
    m: now.getMonth(),
  }));
  const [mode, setMode] = useState<"daily" | "cumulative">("daily");

  // Calculate transactions for the current month view locally from the context data
  const monthTx = useMemo(
    () => transactions.filter((t) => isDateInCalendarMonth(t.date, viewMonth.y, viewMonth.m)),
    [transactions, viewMonth]
  );

  const data = useMemo(
    () => buildSeries(transactions, viewMonth.y, viewMonth.m, mode),
    [transactions, viewMonth, mode]
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
          >
            →
          </button>
          <div className="ml-auto flex rounded-full bg-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setMode("daily")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                mode === "daily" ? "bg-white text-[#063643]" : "text-white/80"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setMode("cumulative")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                mode === "cumulative" ? "bg-white text-[#063643]" : "text-white/80"
              }`}
            >
              Cumulative
            </button>
          </div>
        </div>
      </div>

      <p className="mt-1 text-xs text-white/60">
        {loading ? "Loading data..." : `${monthTx.length} items tracked this month`}
      </p>

      <div className="mt-4 h-56 w-full min-h-[14rem] min-w-0">
        {loading ? (
          <div className="flex h-full items-center justify-center opacity-50">
             <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={35}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#0D2D35",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#fbbf24" }}
                labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}
                formatter={(value: any) => [`$${value.toFixed(2)}`, mode === "daily" ? "Daily Total" : "Month to Date"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#fbbf24"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: "#fbbf24", stroke: "#063643", strokeWidth: 2 }}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}