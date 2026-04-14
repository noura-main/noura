"use client";

import { createContext, useCallback, useContext, useState } from "react";
import ReceiptScanModal from "@/components/budget/ReceiptScanModal";

type ReceiptScanContextValue = {
  openReceiptScan: () => void;
  closeReceiptScan: () => void;
};

const ReceiptScanContext = createContext<ReceiptScanContextValue | null>(null);

export function ReceiptScanProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openReceiptScan = useCallback(() => setOpen(true), []);
  const closeReceiptScan = useCallback(() => setOpen(false), []);

  return (
    <ReceiptScanContext.Provider value={{ openReceiptScan, closeReceiptScan }}>
      {children}
      <ReceiptScanModal open={open} onClose={closeReceiptScan} />
    </ReceiptScanContext.Provider>
  );
}

export function useReceiptScan() {
  const ctx = useContext(ReceiptScanContext);
  if (!ctx) throw new Error("useReceiptScan must be used within ReceiptScanProvider");
  return ctx;
}
