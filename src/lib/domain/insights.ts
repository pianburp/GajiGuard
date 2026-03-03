import { BILLING_CYCLE_YEARLY_MULTIPLIER } from "@/lib/constants";
import { toLocalDateKey } from "@/lib/date";
import { calculateAnnualSavings } from "@/lib/domain/item";
import { getOccurrencesForMonth } from "@/lib/domain/schedule";
import type { Item } from "@/lib/domain/types";
import { formatRM } from "../format";

export interface HeatmapMonth {
  month: number;
  monthLabel: string;
  total: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export type SubscriptionHealthStatus = "keep" | "review" | "cancel";

export interface SubscriptionHealthRow {
  itemId: string;
  itemName: string;
  color: string;
  expectedCount: number;
  paidCount: number;
  consistencyRate: number;
  consecutiveMissedMonths: number;
  monthlyEquivalent: number;
  annualSavings: number;
  status: SubscriptionHealthStatus;
}

export interface CancelSuggestion {
  itemId: string;
  itemName: string;
  color: string;
  consecutiveMissedMonths: number;
  annualSavings: number;
  message: string;
}

export interface AuditSummary {
  keepCount: number;
  reviewCount: number;
  cancelCount: number;
  reviewSavings: number;
  cancelSavings: number;
  inactiveCount: number;
}

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function monthStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function monthDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function toHeatLevel(total: number, maxTotal: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0 || maxTotal <= 0) return 0;
  const ratio = total / maxTotal;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export function buildMonthlySpendingHeatmap(items: Item[], year: number): HeatmapMonth[] {
  const totals = monthLabels.map((monthLabel, month) => {
    const total = getOccurrencesForMonth(items, year, month).reduce(
      (sum, occurrence) => sum + occurrence.amount,
      0,
    );
    return { month, monthLabel, total };
  });

  const maxTotal = totals.reduce((max, entry) => Math.max(max, entry.total), 0);

  return totals.map(({ month, monthLabel, total }) => ({
    month,
    monthLabel,
    total,
    level: toHeatLevel(total, maxTotal),
  }));
}

export function buildSubscriptionHealth(
  items: Item[],
  now = new Date(),
): SubscriptionHealthRow[] {
  const windowMonthStarts = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 6 + idx, 1);
    return monthStart(date);
  });
  const todayKey = toLocalDateKey(now);

  return items
    .filter((item) => item.type === "subscription" && item.isActive)
    .map((item) => {
      const start = monthStart(new Date(item.startDate));
      const monthsSinceStart = Math.max(0, monthDiff(start, monthStart(now)));
      const isNewlyCreated = monthsSinceStart < 2;

      const monthlyStats = windowMonthStarts.map((monthDate, idx) => {
        const allOccurrences = getOccurrencesForMonth(
          [item],
          monthDate.getFullYear(),
          monthDate.getMonth(),
        );
        const isCurrentMonth = idx === windowMonthStarts.length - 1;
        const occurrences = isCurrentMonth
          ? allOccurrences.filter((occurrence) => occurrence.date <= todayKey)
          : allOccurrences;

        const expected = occurrences.length;
        const paid = occurrences.filter((occurrence) => occurrence.status === "paid").length;
        return { expected, paid };
      });

      const expectedCount = monthlyStats.reduce((sum, entry) => sum + entry.expected, 0);
      const paidCount = monthlyStats.reduce((sum, entry) => sum + entry.paid, 0);
      const consistencyRate = expectedCount === 0 ? 1 : paidCount / expectedCount;

      let consecutiveMissedMonths = 0;
      for (let i = monthlyStats.length - 1; i >= 0; i -= 1) {
        const month = monthlyStats[i];
        if (month.expected === 0 || month.paid > 0) break;
        consecutiveMissedMonths += 1;
      }

      const { annual } = calculateAnnualSavings(item);
      const monthlyEquivalent = item.amount * (BILLING_CYCLE_YEARLY_MULTIPLIER[item.billingCycle] / 12);

      let status: SubscriptionHealthStatus = "keep";
      if (consecutiveMissedMonths >= 2 || consistencyRate < 0.4) {
        status = "cancel";
      } else if (consecutiveMissedMonths === 1 || (consistencyRate >= 0.4 && consistencyRate < 0.8)) {
        status = "review";
      }

      if (isNewlyCreated) {
        if (consecutiveMissedMonths >= 2) {
          status = "cancel";
        } else if (consecutiveMissedMonths === 1) {
          status = "review";
        } else {
          status = "keep";
        }
      }

      return {
        itemId: item.id,
        itemName: item.name,
        color: item.color,
        expectedCount,
        paidCount,
        consistencyRate,
        consecutiveMissedMonths,
        monthlyEquivalent,
        annualSavings: annual,
        status,
      };
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        const rank: Record<SubscriptionHealthStatus, number> = { cancel: 0, review: 1, keep: 2 };
        return rank[a.status] - rank[b.status];
      }
      return b.annualSavings - a.annualSavings;
    });
}

export function buildSmartCancelSuggestions(healthRows: SubscriptionHealthRow[]): CancelSuggestion[] {
  return healthRows
    .filter((row) => row.consecutiveMissedMonths >= 2)
    .sort((a, b) => b.annualSavings - a.annualSavings)
    .map((row) => ({
      itemId: row.itemId,
      itemName: row.itemName,
      color: row.color,
      consecutiveMissedMonths: row.consecutiveMissedMonths,
      annualSavings: row.annualSavings,
      message: ` ${row.consecutiveMissedMonths} consecutive missed payments, potential savings of ${formatRM(row.annualSavings)}/annum.`,
    }));
}

export function buildMonthlyAuditSummary(healthRows: SubscriptionHealthRow[]): AuditSummary {
  return healthRows.reduce<AuditSummary>(
    (summary, row) => {
      if (row.status === "keep") summary.keepCount += 1;
      if (row.status === "review") {
        summary.reviewCount += 1;
        summary.reviewSavings += row.annualSavings;
      }
      if (row.status === "cancel") {
        summary.cancelCount += 1;
        summary.cancelSavings += row.annualSavings;
      }
      return summary;
    },
    {
      keepCount: 0,
      reviewCount: 0,
      cancelCount: 0,
      reviewSavings: 0,
      cancelSavings: 0,
      inactiveCount: 0,
    },
  );
}

export function finalizeAuditSummary(summary: AuditSummary): AuditSummary {
  return {
    ...summary,
    inactiveCount: summary.reviewCount + summary.cancelCount,
  };
}
