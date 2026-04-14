"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BudgetTransaction } from "@/lib/budget/types";
import { isDateInWeekContaining, isDateInCalendarMonth } from "@/lib/budget/dates";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const LEGACY_STORAGE_KEY = "noura_budget_v1";
const V2_STORAGE_PREFIX = "noura_budget_v2_";
const DEFAULT_WEEKLY_BUDGET_CAP = 60;

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeV2StorageKey(userId: string | null) {
  // Per-user persistence. If signed-out, we keep a separate anon bucket.
  return userId ? `${V2_STORAGE_PREFIX}${userId}` : `${V2_STORAGE_PREFIX}anon`;
}

function normalizeItems(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x)).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(/\s*,\s*/g).map((s) => s.trim()).filter(Boolean);
  return [];
}

function coerceTransaction(candidate: any): BudgetTransaction | null {
  if (!candidate || typeof candidate !== "object") return null;
  const id = typeof candidate.id === "string" ? candidate.id : null;
  const location = typeof candidate.location === "string" ? candidate.location : typeof candidate.purpose === "string" ? candidate.purpose : "";
  const items = normalizeItems(candidate.items ?? candidate.itemsText);
  const date = typeof candidate.date === "string" ? candidate.date : null;
  const amount = typeof candidate.amount === "number" ? candidate.amount : typeof candidate.amount === "string" ? Number(candidate.amount) : NaN;
  const result = candidate.result === "Done" || candidate.result === "Pending" ? candidate.result : null;
  const type = candidate.type === "Groceries" || candidate.type === "Eating Out" ? candidate.type : null;
  if (!id || !location || !date || !Number.isFinite(amount) || !result || !type) return null;
  return {
    id,
    location,
    items,
    date,
    amount,
    result,
    type,
  };
}

type Persisted = { transactions: BudgetTransaction[]; weeklyBudgetCap: number };

function loadPersisted(storageKey: string): Persisted {
  // IMPORTANT: no seeding placeholders. If the user hasn't logged anything, start at 0.
  if (typeof window === "undefined") return { transactions: [], weeklyBudgetCap: DEFAULT_WEEKLY_BUDGET_CAP };

  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as any;
      const txsRaw = Array.isArray(parsed.transactions) ? parsed.transactions : [];
      const transactions = txsRaw.map(coerceTransaction).filter(Boolean) as BudgetTransaction[];
      const weeklyBudgetCap =
        typeof parsed.weeklyBudgetCap === "number" ? parsed.weeklyBudgetCap : DEFAULT_WEEKLY_BUDGET_CAP;
      return { transactions, weeklyBudgetCap };
    } catch {
      // fall through
    }
  }

  // Optional legacy migration (from older schema + seeded placeholders).
  // We only migrate non-seed rows.
  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return { transactions: [], weeklyBudgetCap: DEFAULT_WEEKLY_BUDGET_CAP };
    const parsed = JSON.parse(legacyRaw) as any;
    const legacyTxs = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    const migrated = legacyTxs
      .filter((t: any) => typeof t?.id === "string" && !t.id.startsWith("seed-"))
      .map(coerceTransaction)
      .filter(Boolean) as BudgetTransaction[];
    const weeklyBudgetCap =
      typeof parsed.weeklyBudgetCap === "number" ? parsed.weeklyBudgetCap : DEFAULT_WEEKLY_BUDGET_CAP;
    return { transactions: migrated, weeklyBudgetCap };
  } catch {
    return { transactions: [], weeklyBudgetCap: DEFAULT_WEEKLY_BUDGET_CAP };
  }
}

type BudgetTransactionsContextValue = {
  transactions: BudgetTransaction[];
  weeklyBudgetCap: number;
  setWeeklyBudgetCap: (n: number) => void;
  addTransaction: (t: Omit<BudgetTransaction, "id"> & { id?: string }) => void;
  addTransactions: (items: Omit<BudgetTransaction, "id">[]) => void;
  updateTransaction: (id: string, patch: Partial<Omit<BudgetTransaction, "id">>) => void;
  deleteTransaction: (id: string) => void;
  /** Sum of Done amounts in the current calendar week (local). */
  weeklySpentDone: number;
  groceriesWeekDone: number;
  eatingOutWeekDone: number;
  remainingThisWeek: number;
};

const BudgetTransactionsContext = createContext<BudgetTransactionsContextValue | null>(null);

export function BudgetTransactionsProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [weeklyBudgetCap, setWeeklyBudgetCapState] = useState(DEFAULT_WEEKLY_BUDGET_CAP);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setUserId(null);
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserId(user?.id ?? null);
      } catch {
        setUserId(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId && userId !== null) return;
    const key = makeV2StorageKey(userId);
    setStorageKey(key);
  }, [userId]);

  useEffect(() => {
    if (!storageKey) return;
    const { transactions: txs, weeklyBudgetCap: cap } = loadPersisted(storageKey);
    // Avoid overwriting any in-flight user additions that may happen before hydration completes.
    setTransactions((prev) => (prev.length ? prev : txs));
    setWeeklyBudgetCapState(cap);
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ transactions, weeklyBudgetCap }));
    } catch {
      // ignore quota
    }
  }, [transactions, weeklyBudgetCap, hydrated, storageKey]);

  const setWeeklyBudgetCap = useCallback((n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    setWeeklyBudgetCapState(n);
  }, []);

  const addTransaction = useCallback((t: Omit<BudgetTransaction, "id"> & { id?: string }) => {
    const row: BudgetTransaction = {
      ...t,
      id: t.id ?? uuid(),
    };
    setTransactions((prev) => [row, ...prev]);
  }, []);

  const addTransactions = useCallback((items: Omit<BudgetTransaction, "id">[]) => {
    const rows: BudgetTransaction[] = items.map((t) => ({
      ...t,
      id: uuid(),
    }));
    setTransactions((prev) => [...rows, ...prev]);
  }, []);

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Omit<BudgetTransaction, "id">>) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
    },
    []
  );

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const { weeklySpentDone, groceriesWeekDone, eatingOutWeekDone, remainingThisWeek } = useMemo(() => {
    const now = new Date();
    const weekRows = transactions.filter(
      (x) => isDateInWeekContaining(x.date, now)
    );
    let groceriesWeekDone = 0;
    let eatingOutWeekDone = 0;
    for (const x of weekRows) {
      if (x.type === "Groceries") groceriesWeekDone += x.amount;
      else eatingOutWeekDone += x.amount;
    }
    const weeklySpentDone = groceriesWeekDone + eatingOutWeekDone;
    const remainingThisWeek = Math.max(0, weeklyBudgetCap - weeklySpentDone);
    return { weeklySpentDone, groceriesWeekDone, eatingOutWeekDone, remainingThisWeek };
  }, [transactions, weeklyBudgetCap]);

  const value = useMemo(
    () => ({
      transactions,
      weeklyBudgetCap,
      setWeeklyBudgetCap,
      addTransaction,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      weeklySpentDone,
      groceriesWeekDone,
      eatingOutWeekDone,
      remainingThisWeek,
    }),
    [
      transactions,
      weeklyBudgetCap,
      setWeeklyBudgetCap,
      addTransaction,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      weeklySpentDone,
      groceriesWeekDone,
      eatingOutWeekDone,
      remainingThisWeek,
    ]
  );

  return <BudgetTransactionsContext.Provider value={value}>{children}</BudgetTransactionsContext.Provider>;
}

export function useBudgetTransactions() {
  const ctx = useContext(BudgetTransactionsContext);
  if (!ctx) throw new Error("useBudgetTransactions must be used within BudgetTransactionsProvider");
  return ctx;
}

/** For chart: filter transactions to a given month. */
export function useTransactionsForMonth(
  transactions: BudgetTransaction[],
  year: number,
  monthIndex0: number
) {
  return useMemo(
    () => transactions.filter((t) => isDateInCalendarMonth(t.date, year, monthIndex0)),
    [transactions, year, monthIndex0]
  );
}
