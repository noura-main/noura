"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, FileSpreadsheet, Pencil, Printer, Share2, Trash2 } from "lucide-react";
import type { BudgetTransaction } from "@/lib/budget/types";
import { useBudgetTransactions } from "@/lib/context/budget-transactions";
import { formatTransactionDateLabel, formatUsd } from "@/lib/budget/format";
import { AllTransactionsModal } from "@/components/budget/AllTransactionsModal";
import { EditTransactionModal } from "@/components/budget/EditTransactionModal";

export type SortMode = "dateDesc" | "amountAsc" | "amountDesc";

function sortTransactions(rows: BudgetTransaction[], mode: SortMode): BudgetTransaction[] {
  const copy = [...rows];
  if (mode === "dateDesc") {
    copy.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.id.localeCompare(a.id);
    });
  } else if (mode === "amountAsc") {
    copy.sort((a, b) => a.amount - b.amount || b.date.localeCompare(a.date));
  } else {
    copy.sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date));
  }
  return copy;
}

function downloadCsv(transactions: BudgetTransaction[]) {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    "Location,Items,Date,Amount,Result,Type",
    ...transactions.map((t) => {
      const items = t.items.join(";");
      return [escape(t.location), escape(items), t.date, String(t.amount), t.result, t.type].join(",");
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "noura-budget-transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

async function shareTransactions(transactions: BudgetTransaction[]) {
  const text = transactions
    .map((t) => {
      const items = t.items.length ? t.items.join(", ") : "—";
      return `${t.location} | ${items} | ${t.date} | ${formatUsd(t.amount)} | ${t.result} | ${t.type}`;
    })
    .join("\n");
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "My transactions", text });
      return;
    } catch {
      /* user cancelled */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    alert("Transaction list copied to clipboard.");
  } catch {
    alert(text);
  }
}

const PREVIEW_ROWS = 8;

function formatItemsCell(items: string[]) {
  if (!items.length) return "—";
  const joined = items.join(", ");
  // Keep table readable with long lists
  if (joined.length > 48) return joined.slice(0, 48) + "…";
  return joined;
}

export function RecentSpendingSection() {
  const { transactions, deleteTransaction } = useBudgetTransactions();
  const [sortMode, setSortMode] = useState<SortMode>("dateDesc");
  const [showAll, setShowAll] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);

  const sorted = useMemo(() => sortTransactions(transactions, sortMode), [transactions, sortMode]);

  const previewRows = sorted.slice(0, PREVIEW_ROWS);
  const editTx = useMemo(() => sorted.find((t) => t.id === editTxId) ?? null, [sorted, editTxId]);

  function confirmDelete(t: BudgetTransaction) {
    const ok = window.confirm(`Delete transaction from ${t.location}? This can't be undone.`);
    if (!ok) return;
    deleteTransaction(t.id);
    if (editTxId === t.id) setEditTxId(null);
  }

  return (
    <>
      <section className="budget-print-area rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-[#0d2e38]">Recent Spending</h2>
          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#063643]/20 px-3 py-1.5 text-xs font-semibold text-[#063643] hover:bg-[#063643]/5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(transactions)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#063643]/20 px-3 py-1.5 text-xs font-semibold text-[#063643] hover:bg-[#063643]/5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={() => shareTransactions(transactions)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#063643]/20 px-3 py-1.5 text-xs font-semibold text-[#063643] hover:bg-[#063643]/5"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#0d2e38]">sort by:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-xl border border-[#3d8489]/30 bg-white px-3 py-2 text-sm text-[#0D2D35] outline-none focus:border-[#3D8489]"
              aria-label="Sort by"
            >
              <option value="dateDesc">Most recent</option>
              <option value="amountDesc">Largest amount</option>
              <option value="amountAsc">Smallest amount</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#eceef0] text-xs font-bold uppercase tracking-wide text-[#6a7f87]">
                <th className="pb-3 pr-4">Location</th>
                <th className="pb-3 pr-4">Item(s)</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3">Result</th>
                <th className="no-print pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6a7f87]">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                previewRows.map((t) => (
                  <tr key={t.id} className="border-b border-[#f3f4f6] last:border-0">
                    <td className="py-3 pr-4 font-medium text-[#0d2e38]">{t.location}</td>
                    <td className="py-3 pr-4 text-[#6a7f87]">{formatItemsCell(t.items)}</td>
                    <td className="py-3 pr-4 text-[#6a7f87]">{formatTransactionDateLabel(t.date)}</td>
                    <td className="py-3 pr-4 tabular-nums font-semibold text-[#0d2e38]">{formatUsd(t.amount)}</td>
                    <td className="py-3">
                      {t.result === "Done" ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-[#2563eb]">
                          <Check className="h-4 w-4 shrink-0" />
                          Done
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-[#6a7f87]">Pending</span>
                      )}
                    </td>
                    <td className="no-print py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditTxId(t.id)}
                          className="rounded-lg border border-[#063643]/20 p-2 text-[#063643] hover:bg-[#063643]/5"
                          aria-label="Edit transaction"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(t)}
                          className="rounded-lg border border-red-500/20 p-2 text-red-600 hover:bg-red-50"
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="no-print mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-[#063643] hover:bg-[#063643]/5"
          >
            Show all my transactions
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </section>

      <AllTransactionsModal
        open={showAll}
        onClose={() => setShowAll(false)}
        transactions={transactions}
        sortMode={sortMode}
      />

      <EditTransactionModal
        open={editTxId !== null}
        onClose={() => setEditTxId(null)}
        transaction={editTx}
      />
    </>
  );
}
