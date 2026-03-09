import type { HeatmapMonth, SubscriptionHealthRow, CancelSuggestion, AuditSummary } from "@/domain/insights";
import type { Item, Occurrence } from "@/domain/types";

export interface BudgetStatus {
  spent: number;
  remaining: number | null;
  overBudget: boolean;
}

export interface DashboardData {
  items: Item[];
  occurrences: Occurrence[];
  healthRows: SubscriptionHealthRow[];
  suggestions: CancelSuggestion[];
  auditSummary: AuditSummary;
  heatmap: HeatmapMonth[];
  budget: number | null;
  budgetStatus: BudgetStatus;
  gajiDay: number;
  monthlyTotal: number;
  previousMonthTotal: number;
}

