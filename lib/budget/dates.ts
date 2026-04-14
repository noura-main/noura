/**
 * Week boundaries: Monday 00:00:00 – Sunday 23:59:59.999 in **local** timezone.
 * Compare using calendar YYYY-MM-DD strings from transactions.
 */

function parseLocalDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function getMonday(d: Date): Date {
  const c = new Date(d);
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isDateInWeekContaining(isoDate: string, anchor: Date): boolean {
  const t = parseLocalDay(isoDate);
  const monday = getMonday(anchor);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return t >= monday && t <= sunday;
}

export function isDateInCalendarMonth(isoDate: string, year: number, monthIndex0: number): boolean {
  const t = parseLocalDay(isoDate);
  return t.getFullYear() === year && t.getMonth() === monthIndex0;
}

export { toYMD };
