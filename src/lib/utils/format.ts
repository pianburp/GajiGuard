export function formatRM(amount: number): string {
  const formatted = new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `RM ${formatted}`;
}

export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(isoDate));
}

export function formatRelativeDate(isoDate: string): string {
  const target = startOfDay(new Date(isoDate));
  const now = startOfDay(new Date());
  const days = Math.round((target.getTime() - now.getTime()) / 86400000);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  return `${Math.abs(days)} days overdue`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
