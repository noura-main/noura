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
import { isDateInWeekContaining } from "@/lib/budget/dates";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DEFAULT_WEEKLY_BUDGET_CAP = 60;

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface BudgetContextValue {
  transactions: BudgetTransaction[];
  loading: boolean;
  weeklyBudgetCap: number;
  setWeeklyBudgetCap: (n: number) => void;
  addTransaction: (t: Omit<BudgetTransaction, "id">) => Promise<void>;
  addTransactions: (items: BudgetTransaction[]) => void;
  updateTransaction: (id: string | number, patch: Partial<Omit<BudgetTransaction, "id">>) => Promise<void>;
  deleteTransaction: (id: string | number) => Promise<void>;
  weeklySpentDone: number;
  groceriesWeekDone: number;
  eatingOutWeekDone: number;
  remainingThisWeek: number;
}

const BudgetTransactionsContext = createContext<BudgetContextValue | null>(null);

export function BudgetTransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [weeklyBudgetCap, setWeeklyBudgetCapState] = useState(DEFAULT_WEEKLY_BUDGET_CAP);
  const [loading, setLoading] = useState(true);

  // 1. Fetch from Supabase on Load
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: false });

        if (!error && data) {
          setTransactions(data as BudgetTransaction[]);
        }
      } catch (err) {
        console.error("Error loading transactions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const setWeeklyBudgetCap = useCallback((n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    setWeeklyBudgetCapState(n);
  }, []);

  // 2. Add Transaction to DB
const addTransaction = useCallback(async (t: Omit<BudgetTransaction, "id">) => {
  // 1. Get the current user right here inside the function
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Combine the transaction data with the user_id
  const transactionWithUser = {
    ...t,
    user_id: user?.id, // This ensures every manual add gets the ID
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert([transactionWithUser]) // Insert the enriched object
    .select()
    .single();

  if (!error && data) {
    setTransactions((prev) => [data as BudgetTransaction, ...prev]);
  } else if (error) {
    console.error("Error adding transaction:", error.message);
  }
}, []);

  // 3. Sync AI Transactions (Already saved in DB by the route.ts)
  const addTransactions = useCallback((items: BudgetTransaction[]) => {
    setTransactions((prev) => [...items, ...prev]);
  }, []);

  // 4. Update Transaction in DB
  const updateTransaction = useCallback(
    async (id: string | number, patch: Partial<Omit<BudgetTransaction, "id">>) => {
      const { error } = await supabase
        .from("transactions")
        .update(patch)
        .eq("id", id);

      if (!error) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
        );
      }
    },
    []
  );

  // 5. Delete Transaction from DB
  const deleteTransaction = useCallback(async (id: string | number) => {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  // Calculations for Weekly Dashboard
  const { weeklySpentDone, groceriesWeekDone, eatingOutWeekDone, remainingThisWeek } = useMemo(() => {
    const now = new Date();
    const weekRows = transactions.filter((x) => isDateInWeekContaining(x.date, now));
    
    let gSum = 0;
    let eSum = 0;
    for (const x of weekRows) {
      if (x.type === "Groceries") gSum += x.amount;
      else eSum += x.amount;
    }
    
    return {
      weeklySpentDone: gSum + eSum,
      groceriesWeekDone: gSum,
      eatingOutWeekDone: eSum,
      remainingThisWeek: Math.max(0, weeklyBudgetCap - (gSum + eSum)),
    };
  }, [transactions, weeklyBudgetCap]);

  const value = useMemo(
    () => ({
      transactions,
      loading,
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
      loading,
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