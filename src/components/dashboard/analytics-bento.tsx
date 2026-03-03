"use client";

import { useMemo, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BudgetBar } from "@/components/dashboard/budget-bar";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { SavingsOverview } from "@/components/dashboard/savings-overview";
import { RecurringCostHeatmap } from "@/components/dashboard/recurring-cost-heatmap";
import { SmartCancelSuggestions } from "@/components/dashboard/smart-cancel-suggestions";
import { SubscriptionHealthAudit } from "@/components/dashboard/subscription-health-audit";
import { MonthlyReviewPrompt } from "@/components/dashboard/monthly-review-prompt";
import {
  buildMonthlySpendingHeatmap,
  buildSubscriptionHealth,
  buildSmartCancelSuggestions,
  buildMonthlyAuditSummary,
  finalizeAuditSummary,
} from "@/lib/domain/insights";
import type { Item, Occurrence } from "@/lib/domain/types";

interface AnalyticsBentoProps {
  items: Item[];
  occurrences: Occurrence[];
  itemsById: Record<string, Item>;
  budget: number | null;
  onSetBudget: (amount: number | null) => void;
  monthDate: Date;
}

const PANEL_TRANSITION = {
  type: "spring" as const,
  stiffness: 260,
  damping: 30,
  mass: 0.85,
};

export function AnalyticsBento({
  items,
  occurrences,
  itemsById,
  budget,
  onSetBudget,
  monthDate,
}: AnalyticsBentoProps) {
  const year = monthDate.getFullYear();
  const heatmapMonths = useMemo(() => buildMonthlySpendingHeatmap(items, year), [items, year]);
  const healthRows = useMemo(() => buildSubscriptionHealth(items, new Date()), [items]);
  const suggestions = useMemo(() => buildSmartCancelSuggestions(healthRows), [healthRows]);
  const summary = useMemo(
    () => finalizeAuditSummary(buildMonthlyAuditSummary(healthRows)),
    [healthRows],
  );

  const [isSavingsOpen, setIsSavingsOpen] = useState(false);

  return (
    <div className="mt-8 space-y-6">
      <MonthlyReviewPrompt inactiveCount={summary.inactiveCount} />

      {/* Modern Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 auto-rows-max gap-5">

        {/* Hero Top Left (Spans 8 cols) */}
        <div className="md:col-span-6 lg:col-span-8 flex flex-col">
          <div className="flex-1 rounded-xl">
            <RecurringCostHeatmap year={year} months={heatmapMonths} />
          </div>
        </div>

        {/* Top Right Budget (Spans 4 cols) */}
        <div className="md:col-span-3 lg:col-span-4 flex flex-col">
          <Card className="flex-1 rounded-xl border border-gray-200/60 dark:border-white/10 bg-gradient-to-br from-white to-gray-50/40 dark:from-[#1c1c1e] dark:to-[#1c1c1e]/80 shadow-sm flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Monthly Budget</CardTitle>
              <CardDescription className="text-xs">Track your monthly spending limits.</CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetBar
                budget={budget}
                spent={occurrences
                  .filter((occurrence) => occurrence.status !== "paid")
                  .reduce((sum, occurrence) => sum + occurrence.amount, 0)}
                onSetBudget={onSetBudget}
              />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Left Health Audit (Spans 5 cols) */}
        <div className="md:col-span-6 lg:col-span-5 flex flex-col">
          <div className="flex-1 rounded-xl">
            <SubscriptionHealthAudit rows={healthRows} summary={summary} />
          </div>
        </div>

        {/* Bottom Middle Suggestions (Spans 3 cols) */}
        <div className="md:col-span-3 lg:col-span-3 flex flex-col">
          <div className="flex-1 rounded-xl">
            <SmartCancelSuggestions suggestions={suggestions} />
          </div>
        </div>

        {/* Bottom Right Savings Mix (Spans 4 cols) */}
        <div className="md:col-span-3 lg:col-span-4 flex flex-col">
          <Card className="flex-1 rounded-xl border border-gray-200/60 dark:border-white/10 bg-white dark:bg-[#1c1c1e] shadow-sm flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Category Mix & Savings</CardTitle>
              <CardDescription className="text-xs">Visualize your expenses by category.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col overflow-x-hidden">
              <LayoutGroup id="category-savings-panel">
                <motion.div
                  layout
                  transition={PANEL_TRANSITION}
                  className="flex flex-1 flex-col justify-between space-y-6"
                >
                  <CategoryDonut occurrences={occurrences} itemsById={itemsById} isCompact={isSavingsOpen} />
                  <SavingsOverview items={items} isExpanded={isSavingsOpen} onExpandedChange={setIsSavingsOpen} />
                </motion.div>
              </LayoutGroup>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
