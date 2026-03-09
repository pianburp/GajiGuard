import type { Category, Item, Occurrence } from "@/domain/types";

export interface TopSubscription {
  name: string;
  amount: number;
}

export interface SummaryStats {
  activeItemCount: number;
  monthlyTotal: number;
  yearlyProjection: number;
  topSubscriptions: TopSubscription[];
  categoryBreakdown: { name: string; percentage: number }[];
}

export function toMonthLabel(monthDate: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    month: "long",
    year: "numeric",
  }).format(monthDate);
}

export function computeSummaryStats(items: Item[], occurrences: Occurrence[]): SummaryStats {
  const activeItemCount = items.filter((item) => item.isActive).length;
  const monthlyTotal = occurrences.reduce((sum, occurrence) => sum + occurrence.amount, 0);
  const yearlyProjection = monthlyTotal * 12;
  const itemsById = new Map(items.map((item) => [item.id, item]));

  const subscriptionTotals = new Map<string, number>();
  for (const occurrence of occurrences) {
    const item = itemsById.get(occurrence.itemId);
    if (!item || item.type !== "subscription") continue;
    const current = subscriptionTotals.get(item.id) ?? 0;
    subscriptionTotals.set(item.id, current + occurrence.amount);
  }

  const topSubscriptions = Array.from(subscriptionTotals.entries())
    .map(([itemId, amount]) => {
      const item = itemsById.get(itemId);
      return {
        name: item?.name ?? "Unknown",
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const categoryTotals = new Map<Category, number>();
  for (const occurrence of occurrences) {
    const item = itemsById.get(occurrence.itemId);
    if (!item) continue;
    const current = categoryTotals.get(item.category) ?? 0;
    categoryTotals.set(item.category, current + occurrence.amount);
  }

  const categoryBreakdown = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => {
      let labelName: string = name;
      if (labelName === "other") {
        labelName = "Productivity / Tools";
      }
      return {
        name: labelName,
        percentage: monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0,
      };
    });

  return {
    activeItemCount,
    monthlyTotal,
    yearlyProjection,
    topSubscriptions,
    categoryBreakdown,
  };
}
