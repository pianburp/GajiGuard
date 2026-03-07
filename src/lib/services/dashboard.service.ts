import {
  buildMonthlyAuditSummary,
  buildMonthlySpendingHeatmap,
  buildSmartCancelSuggestions,
  buildSubscriptionHealth,
  finalizeAuditSummary,
} from "@/lib/domain/insights";
import { getOccurrencesForMonth } from "@/lib/domain/schedule";
import type { BudgetStatus, DashboardData } from "@/lib/domain/dashboard";
import type { Occurrence } from "@/lib/domain/types";
import * as userRepo from "@/lib/repositories/user.repository";
import { getItemsByUserId } from "@/lib/services/item.service";

function sumUnpaid(occurrences: Occurrence[]): number {
  return occurrences
    .filter((occurrence) => occurrence.status !== "paid")
    .reduce((total, occurrence) => total + occurrence.amount, 0);
}

function computeBudgetStatus(
  occurrences: Occurrence[],
  budget: number | null,
): BudgetStatus {
  const spent = sumUnpaid(occurrences);
  if (budget === null) {
    return {
      spent,
      remaining: null,
      overBudget: false,
    };
  }

  const remaining = budget - spent;
  return {
    spent,
    remaining,
    overBudget: remaining < 0,
  };
}

export async function getDashboardDataForUser(
  userId: string,
  year: number,
  month: number,
): Promise<DashboardData> {
  const [items, settings] = await Promise.all([
    getItemsByUserId(userId),
    userRepo.getUserSettings(userId),
  ]);

  const budget = settings.monthlyBudget;
  const gajiDay = settings.gajiDay;

  const occurrences = getOccurrencesForMonth(items, year, month);
  const healthRows = buildSubscriptionHealth(items, new Date());
  const suggestions = buildSmartCancelSuggestions(healthRows);
  const auditSummary = finalizeAuditSummary(
    buildMonthlyAuditSummary(healthRows),
  );
  const heatmap = buildMonthlySpendingHeatmap(items, year);
  const budgetStatus = computeBudgetStatus(occurrences, budget);
  const monthlyTotal = sumUnpaid(occurrences);

  const previousMonthDate = new Date(year, month, 1);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthOccurrences = getOccurrencesForMonth(
    items,
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth(),
  );
  const previousMonthTotal = sumUnpaid(previousMonthOccurrences);

  return {
    items,
    occurrences,
    healthRows,
    suggestions,
    auditSummary,
    heatmap,
    budget,
    budgetStatus,
    gajiDay,
    monthlyTotal,
    previousMonthTotal,
  };
}

