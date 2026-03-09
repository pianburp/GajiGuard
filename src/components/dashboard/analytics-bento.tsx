"use client";

import { useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BudgetBar } from "@/components/dashboard/budget-bar";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { SavingsOverview } from "@/components/dashboard/savings-overview";
import { RecurringCostHeatmap } from "@/components/dashboard/recurring-cost-heatmap";
import { SmartCancelSuggestions } from "@/components/dashboard/smart-cancel-suggestions";
import { SubscriptionHealthAudit } from "@/components/dashboard/subscription-health-audit";
import { MonthlyReviewPrompt } from "@/components/dashboard/monthly-review-prompt";
import { PersonalSummaryShareCard } from "@/components/dashboard/personal-summary-share-card";
import type { Category, Item, Occurrence } from "@/domain/types";
import type { DashboardData } from "@/domain/dashboard";

interface AnalyticsBentoProps {
  items: Item[];
  occurrences: Occurrence[];
  previousMonthOccurrences: Occurrence[];
  itemsById: Record<string, Item>;
  budget: number | null;
  budgetStatus: DashboardData["budgetStatus"];
  budgetHistory: Array<{
    monthKey: string;
    monthLabel: string;
    spent: number;
  }>;
  onSetBudget: (amount: number | null) => void;
  categoryFilter: Category | null;
  onCategoryFilterChange: (category: Category | null) => void;
  monthDate: Date;
  healthRows: DashboardData["healthRows"];
  suggestions: DashboardData["suggestions"];
  auditSummary: DashboardData["auditSummary"];
  heatmap: DashboardData["heatmap"];
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
  previousMonthOccurrences,
  itemsById,
  budget,
  budgetStatus,
  budgetHistory,
  onSetBudget,
  categoryFilter,
  onCategoryFilterChange,
  monthDate,
  healthRows,
  suggestions,
  auditSummary,
  heatmap,
}: AnalyticsBentoProps) {
  const year = monthDate.getFullYear();

  const [isSavingsOpen, setIsSavingsOpen] = useState(false);

  return (
    <div className="mt-8 space-y-6">
      <MonthlyReviewPrompt inactiveCount={auditSummary.inactiveCount} />

      {/* Modern Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 auto-rows-max gap-5">

        {/* Hero Top Left (Spans 8 cols) */}
        <div className="md:col-span-6 lg:col-span-8 flex flex-col">
          <div className="flex-1 rounded-xl">
            <RecurringCostHeatmap year={year} months={heatmap} />
          </div>
        </div>

        {/* Top Right Budget (Spans 4 cols) */}
        <div className="md:col-span-3 lg:col-span-4 flex flex-col">
          <Card className="flex-1 rounded-xl border flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Monthly Budget</CardTitle>
              <CardDescription className="text-xs">Track your monthly spending limits.</CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetBar
                budget={budget}
                spent={budgetStatus.spent}
                history={budgetHistory}
                onSetBudget={onSetBudget}
              />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Left Health Audit (Spans 5 cols) */}
        <div className="md:col-span-6 lg:col-span-5 flex flex-col">
          <div className="flex-1 rounded-xl">
            <SubscriptionHealthAudit rows={healthRows} summary={auditSummary} />
          </div>
        </div>

        {/* Bottom Middle Suggestions + Share Summary (Spans 3 cols) */}
        <div className="md:col-span-3 lg:col-span-3 flex h-full flex-col gap-5">
          <div className="rounded-xl">
            <SmartCancelSuggestions suggestions={suggestions} />
          </div>
          <div className="flex-1 rounded-xl">
            <PersonalSummaryShareCard
              items={items}
              occurrences={occurrences}
              monthDate={monthDate}
            />
          </div>
        </div>

        {/* Bottom Right Savings Mix (Spans 4 cols) */}
        <div className="md:col-span-3 lg:col-span-4 flex flex-col">
          <Card className="flex-1 rounded-xl border flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Category Mix & Savings</CardTitle>
              <CardDescription className="text-xs">Visualize your expenses by category.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col overflow-hidden">
              <LayoutGroup id="category-savings-panel">
                <motion.div
                  layout
                  transition={PANEL_TRANSITION}
                  className="flex flex-1 flex-col justify-between space-y-6"
                >
                  <CategoryDonut
                    occurrences={occurrences}
                    previousMonthOccurrences={previousMonthOccurrences}
                    itemsById={itemsById}
                    selectedCategory={categoryFilter}
                    onCategorySelect={onCategoryFilterChange}
                    isCompact={isSavingsOpen}
                  />
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
