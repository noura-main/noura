"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { BudgetTransaction } from "@/lib/budget/types";
import { formatTransactionDateLabel, formatUsd } from "@/lib/budget/format";

type SortMode = "dateDesc" | "amountAsc" | "amountDesc";

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

type Props = {
  open: boolean;
  onClose: () => void;
  transactions: BudgetTransaction[];
  sortMode: SortMode;
};

const PAGE = 20;

export function AllTransactionsModal({ open, onClose, transactions, sortMode }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(PAGE);

  const sorted = useMemo(() => sortTransactions(transactions, sortMode), [transactions, sortMode]);

  useEffect(() => {
    if (open) {
      setVisible(PAGE);
      closeRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const slice = sorted.slice(0, visible);
  const hasMore = visible < sorted.length;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{ background: "rgba(6,54,67,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(61,132,137,0.18)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className="flex shrink-0 items-center justify-between px-6 py-5"
          style={{ background: "#0D2D35" }}
        >
          <div>
            <p className="text-[10px] font-black tracking-[0.22em] text-white/45">ALL TRANSACTIONS</p>
            <h2 id={titleId} className="text-xl font-bold text-white">
              {sorted.length} total
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/15"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ul className="divide-y divide-[#eceef0]">
            {slice.map((t) => (
              <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-semibold text-[#0d2e38]">{t.location}</p>
                  <p className="text-xs text-[#6a7f87]">
                    {t.items.length ? t.items.join(", ") : "—"}
                  </p>
                  <p className="text-xs text-[#6a7f87]">
                    {formatTransactionDateLabel(t.date)} · {t.type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-[#0d2e38]">{formatUsd(t.amount)}</p>
                  <p
                    className={`text-xs font-medium ${
                      t.result === "Done" ? "text-[#2563eb]" : "text-[#6a7f87]"
                    }`}
                  >
                    {t.result}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#063643]/25 py-3 text-sm font-semibold text-[#063643] hover:bg-[#063643]/5"
            >
              Load more
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
