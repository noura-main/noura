export type BudgetTransactionResult = "Done" | "Pending";

export type BudgetTransactionType = "Groceries" | "Eating Out";

export type BudgetTransaction = {
  id: string;
  /** Merchant/store location (e.g. Walmart). */
  location: string;
  /** Items purchased/consumed (one or many). */
  items: string[];
  /** YYYY-MM-DD (local calendar date) */
  date: string;
  amount: number;
  result: BudgetTransactionResult;
  type: BudgetTransactionType;
  user_id?: string
};

export type BudgetPersisted = {
  transactions: BudgetTransaction[];
  weeklyBudgetCap: number;
};
