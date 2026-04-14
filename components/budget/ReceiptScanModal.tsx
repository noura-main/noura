"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { useBudgetTransactions } from "@/lib/context/budget-transactions";
import type { BudgetTransaction, BudgetTransactionType } from "@/lib/budget/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

const MOCK_POOL: {
  location: string;
  items: string[];
  type: BudgetTransactionType;
  amountMin: number;
  amountMax: number;
}[] = [
  { location: "Whole Foods", type: "Groceries", items: ["apples", "spinach", "almonds", "olive oil"], amountMin: 12, amountMax: 45 },
  { location: "Trader Joe's", type: "Groceries", items: ["banana", "granola", "kale chips", "yogurt"], amountMin: 8, amountMax: 32 },
  { location: "Kroger", type: "Groceries", items: ["oats", "blueberries", "cheddar", "eggs"], amountMin: 15, amountMax: 55 },
  { location: "Walmart", type: "Groceries", items: ["rice", "beans", "tomatoes", "tortillas"], amountMin: 20, amountMax: 60 },
  { location: "Starbucks", type: "Eating Out", items: ["latte", "cold brew"], amountMin: 3, amountMax: 9 },
  { location: "Chipotle", type: "Eating Out", items: ["burrito", "guacamole", "salsa"], amountMin: 9, amountMax: 14 },
  { location: "Local Cafe", type: "Eating Out", items: ["sandwich", "salad", "tea"], amountMin: 5, amountMax: 12 },
];

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function todayYMD() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pickSubset<T>(arr: T[]) {
  const copy = [...arr];
  const take = Math.max(1, Math.min(copy.length, randomInt(1, Math.min(4, copy.length))));
  const out: T[] = [];
  for (let i = 0; i < take; i++) {
    const idx = randomInt(0, copy.length - 1);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

function generateMockRows(): Omit<BudgetTransaction, "id">[] {
  const n = randomInt(1, 3);
  const rows: Omit<BudgetTransaction, "id">[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n; i++) {
    let idx = randomInt(0, MOCK_POOL.length - 1);
    let guard = 0;
    while (used.has(idx) && guard++ < 20) idx = randomInt(0, MOCK_POOL.length - 1);
    used.add(idx);
    const m = MOCK_POOL[idx];
    rows.push({
      location: m.location,
      items: pickSubset(m.items),
      date: todayYMD(),
      amount: randomInt(m.amountMin, m.amountMax),
      result: Math.random() > 0.15 ? "Done" : "Pending",
      type: m.type,
    });
  }
  return rows;
}

export default function ReceiptScanModal({ open, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { addTransactions } = useBudgetTransactions();
  const [phase, setPhase] = useState<"idle" | "processing" | "done">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setMessage("");
      return;
    }
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

  function handleFile() {
    setPhase("processing");
    setMessage("Reading receipt…");
    window.setTimeout(() => {
      setMessage("Extracting line items…");
    }, 400);
    window.setTimeout(() => {
      const rows = generateMockRows();
      addTransactions(rows);
      setPhase("done");
      setMessage(`Added ${rows.length} purchase${rows.length === 1 ? "" : "s"} from receipt.`);
    }, 1400);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(6,54,67,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "processing") onClose();
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
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(61,132,137,0.20)" }}
            >
              <ScanLine className="h-5 w-5 text-[#3D8489]" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.22em] text-white/45">SCAN RECEIPT</p>
              <h2 id={titleId} className="text-xl font-bold text-white">
                Add purchases from receipt
              </h2>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={phase === "processing"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/15 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {phase === "idle" && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[#0d2e38]/70">
                Take a photo or upload an image of your grocery receipt. We&apos;ll parse line items
                (demo uses simulated data).
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#3d8489]/40 bg-[#063643]/5 px-4 py-10 transition hover:bg-[#063643]/10">
                <ScanLine className="mb-2 h-10 w-10 text-[#063643]" />
                <span className="text-sm font-semibold text-[#0d2e38]">Choose image</span>
                <span className="mt-1 text-xs text-[#6a7f87]">PNG, JPG — max demo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files?.length) handleFile();
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          {phase === "processing" && (
            <div className="flex flex-col items-center py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#063643] border-t-transparent" />
              <p className="mt-4 text-sm font-medium text-[#0d2e38]">{message}</p>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-4">
              <p className="text-sm text-[#0d2e38]">{message}</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    setMessage("");
                  }}
                  className="rounded-full border-2 border-[#0D2D35] px-4 py-2 text-xs font-bold text-[#0D2D35] hover:bg-[#0D2D35] hover:text-white"
                >
                  Scan another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-[#0D2D35] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
