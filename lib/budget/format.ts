export function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Label for YYYY-MM-DD: "Today", "Yesterday", or short date */
export function formatTransactionDateLabel(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(t);
  cmp.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - cmp.getTime()) / (24 * 3600 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function monthYearLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
