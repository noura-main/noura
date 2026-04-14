"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ScanLine, X, Utensils, ShoppingBasket } from "lucide-react";
import { useBudgetTransactions } from "@/lib/context/budget-transactions";
import type { BudgetTransaction, BudgetTransactionType } from "@/lib/budget/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

function todayYMD() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ReceiptScanModal({ open, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { addTransactions } = useBudgetTransactions();
  
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "processing" | "done">("idle");
  const [message, setMessage] = useState("");
  // Defaulting to Eating Out since Groceries is disabled
  const [scanMode, setScanMode] = useState<"Groceries" | "Eating Out">("Eating Out");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setMessage("");
      return;
    }
    closeRef.current?.focus();
  }, [open]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhase("processing");
    setMessage(scanMode === "Groceries" ? "Parsing individual items..." : "Calculating total...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scanMode", scanMode);

      const response = await fetch("/api/process-receipt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scan");
      }

      const rawData = await response.json();
      
      const dataArray = Array.isArray(rawData) 
        ? rawData 
        : (rawData.transactions || rawData.items || [rawData]);

      const transactions: Omit<BudgetTransaction, "id">[] = dataArray.map((item: any) => ({
        location: item.location || "Unknown Store",
        items: Array.isArray(item.items) ? item.items : [item.name || (scanMode === "Eating Out" ? "Dining" : "Item")],
        date: item.date || todayYMD(),
        amount: typeof item.amount === "number" ? item.amount : parseFloat(item.amount) || 0,
        result: "Done" as const,
        type: (item.type as BudgetTransactionType) || scanMode,
      }));

      addTransactions(transactions);
      setPhase("done");
      setMessage(`Successfully added ${transactions.length} entry to your budget.`);
    } catch (err: any) {
      console.error(err);
      setPhase("idle");
      alert(err.message || "Error scanning receipt");
    } finally {
      e.target.value = "";
    }
  }

  if (!open || !mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(6,54,67,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl bg-white"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative flex items-center justify-between px-6 py-5 bg-[#0D2D35]">
          <div className="flex items-center gap-3 text-white">
            <ScanLine className="h-6 w-6 text-[#3D8489]" />
            <h2 className="text-xl font-bold">Receipt Scanner</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {phase === "idle" && (
            <div className="space-y-6">
              {/* UPDATED TOGGLE SWITCH */}
              <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
                {/* DINING ON THE LEFT */}
                <button
                  onClick={() => setScanMode("Eating Out")}
                  className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all ${
                    scanMode === "Eating Out" ? "bg-white shadow-md text-[#0D2D35]" : "text-gray-500"
                  }`}
                >
                  <Utensils size={16} />
                  Dining
                </button>

                {/* GROCERIES ON THE RIGHT (DISABLED) */}
                <div className="relative flex-1">
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl text-gray-400 cursor-not-allowed opacity-60"
                  >
                    <ShoppingBasket size={16} />
                    Groceries
                  </button>
                  <span className="absolute -top-1 -right-1 bg-[#3D8489] text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm">
                    Soon
                  </span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600 italic">
                  Dining mode: The restaurant total will be added as a single entry.
                </p>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#3D8489]/30 bg-[#F4F7F7] px-4 py-12 transition hover:bg-[#EBF1F2]">
                <div className="h-12 w-12 mb-3 bg-[#3D8489]/10 rounded-full flex items-center justify-center">
                  <ScanLine className="h-6 w-6 text-[#3D8489]" />
                </div>
                <span className="text-sm font-bold text-[#0D2D35]">Upload Receipt</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleFile} />
              </label>
            </div>
          )}

          {phase === "processing" && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#3D8489] border-t-transparent mb-4" />
              <p className="text-lg font-bold text-[#0D2D35]">AI is working...</p>
              <p className="text-sm text-gray-500">{message}</p>
            </div>
          )}

          {phase === "done" && (
            <div className="text-center py-6 space-y-6">
              <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <ScanLine size={32} />
              </div>
              <p className="font-medium text-[#0D2D35]">{message}</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setPhase("idle")}
                  className="w-full py-3 text-sm font-bold text-[#3D8489] border-2 border-[#3D8489] rounded-xl"
                >
                  Scan Another
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-sm font-bold bg-[#0D2D35] text-white rounded-xl"
                >
                  View Budget
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}