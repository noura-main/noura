"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useBudgetTransactions } from "@/lib/context/budget-transactions";
import type { BudgetTransactionResult, BudgetTransactionType } from "@/lib/budget/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LogPurchaseModal({ open, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { addTransaction } = useBudgetTransactions();
  const [location, setLocation] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [date, setDate] = useState(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<BudgetTransactionResult>("Done");
  const [type, setType] = useState<BudgetTransactionType>("Groceries");

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    const items = itemsText
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!location.trim() || items.length === 0 || !Number.isFinite(n) || n < 0) return;
    addTransaction({
      location: location.trim(),
      items,
      date,
      amount: n,
      result,
      type,
    });
    setLocation("");
    setItemsText("");
    setAmount("");
    setResult("Done");
    setType("Groceries");
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: "rgba(6,54,67,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(61,132,137,0.18)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className="relative flex items-center justify-between px-6 py-5"
          style={{ background: "#0D2D35" }}
        >
          <div>
            <p className="text-[10px] font-black tracking-[0.22em] text-white/45">LOG PURCHASE</p>
            <h2 id={titleId} className="text-xl font-bold text-white">
              Add transaction
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

        <form onSubmit={submit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0d2e38]/50">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-[#3d8489]/30 bg-[#0d2e38]/[0.04] px-3 py-2 text-sm text-[#0D2D35] outline-none focus:border-[#3D8489]"
              placeholder="e.g. Walmart"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0d2e38]/50">Item(s)</label>
            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              className="min-h-[88px] w-full resize-y rounded-xl border border-[#3d8489]/30 bg-[#0d2e38]/[0.04] px-3 py-2 text-sm text-[#0D2D35] outline-none focus:border-[#3D8489]"
              placeholder="One per line (or comma-separated). e.g. apples, chocolate"
              required
            />
            <p className="mt-1 text-[11px] text-[#6a7f87]">Add as many items as you want.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0d2e38]/50">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[#3d8489]/30 bg-[#0d2e38]/[0.04] px-3 py-2 text-sm text-[#0D2D35] outline-none focus:border-[#3D8489]"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0d2e38]/50">Amount</label>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-[#3d8489]/30 bg-[#0d2e38]/[0.04] px-3 py-2 text-sm text-[#0D2D35] outline-none focus:border-[#3D8489]"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0d2e38]/50">Result</label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as BudgetTransactionResult)}
              className="w-full rounded-xl border border-[#3d8489]/30 bg-white px-3 py-2 text-sm text-[#0D2D35] outline-none focus:border-[#3D8489]"
            >
              <option value="Done">Done</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#0d2e38]/50">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BudgetTransactionType)}
              className="w-full rounded-xl border border-[#3d8489]/30 bg-white px-3 py-2 text-sm text-[#0D2D35] outline-none focus:border-[#3D8489]"
            >
              <option value="Groceries">Groceries</option>
              <option value="Eating Out">Eating Out</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border-2 border-[#0D2D35] px-4 py-2 text-xs font-bold text-[#0D2D35] hover:bg-[#0D2D35] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#0D2D35] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
