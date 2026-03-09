"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { CATEGORY_COLORS, CATEGORY_OPTIONS } from "@/lib/config/constants";
import { formatRM } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { Item, Occurrence, Category } from "@/domain/types";

interface CategoryDonutProps {
  occurrences: Occurrence[];
  previousMonthOccurrences: Occurrence[];
  itemsById: Record<string, Item>;
  selectedCategory: Category | null;
  onCategorySelect: (category: Category | null) => void;
  isCompact?: boolean;
}

interface ChartDatum {
  category: Category;
  label: string;
  amount: number;
  color: string;
}

interface DonutLayerProps {
  data: ChartDatum[];
  compareData: ChartDatum[];
  total: number;
  selectedCategory: Category | null;
  onCategorySelect: (category: Category | null) => void;
  showCompare: boolean;
}

const BASE_DONUT_SIZE = 160;
const COMPACT_DONUT_SIZE = 100;
const LAYOUT_TRANSITION = {
  type: "spring" as const,
  stiffness: 260,
  damping: 30,
  mass: 0.85,
};
const SIZE_TRANSITION = {
  duration: 0.34,
  ease: [0.22, 1, 0.36, 1] as const,
};

const categoryLabelMap = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Category, string>;

function mergeCategories(current: ChartDatum[], previous: ChartDatum[]): ChartDatum[] {
  const byCategory = new Map<Category, ChartDatum>();

  for (const entry of [...current, ...previous]) {
    if (!byCategory.has(entry.category)) {
      byCategory.set(entry.category, {
        category: entry.category,
        label: entry.label,
        amount: 0,
        color: entry.color,
      });
    }
  }

  return Array.from(byCategory.values());
}

function DonutLayer({
  data,
  compareData,
  total,
  selectedCategory,
  onCategorySelect,
  showCompare,
}: DonutLayerProps) {
  const previousTotal = compareData.reduce((sum, entry) => sum + entry.amount, 0);

  const handleSliceClick = (category: Category) => {
    onCategorySelect(selectedCategory === category ? null : category);
  };

  return (
    <div className="relative" style={{ width: BASE_DONUT_SIZE, height: BASE_DONUT_SIZE }}>
      <PieChart width={BASE_DONUT_SIZE} height={BASE_DONUT_SIZE}>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={showCompare ? 54 : 50}
          outerRadius={80}
          strokeWidth={2}
          stroke="var(--background)"
          isAnimationActive={false}
          onClick={(entry: ChartDatum) => handleSliceClick(entry.category)}
        >
          {data.map((d) => {
            const isMuted = selectedCategory !== null && selectedCategory !== d.category;
            return (
              <Cell
                key={`current-${d.category}`}
                fill={d.color}
                fillOpacity={isMuted ? 0.35 : 1}
                cursor="pointer"
              />
            );
          })}
        </Pie>

        {showCompare && compareData.length > 0 && (
          <Pie
            data={compareData}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={34}
            outerRadius={48}
            strokeWidth={2}
            stroke="var(--background)"
            isAnimationActive={false}
            onClick={(entry: ChartDatum) => handleSliceClick(entry.category)}
          >
            {compareData.map((d) => {
              const isMuted = selectedCategory !== null && selectedCategory !== d.category;
              return (
                <Cell
                  key={`prev-${d.category}`}
                  fill={d.color}
                  fillOpacity={isMuted ? 0.25 : 0.55}
                  cursor="pointer"
                />
              );
            })}
          </Pie>
        )}

        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload as ChartDatum;
            const value = Number(payload[0].value ?? d.amount);
            const parentTotal = showCompare && payload[0].name === d.label && payload[0].payload === d
              ? payload[0].payload === d && compareData.some((entry) => entry.category === d.category)
                ? total
                : total
              : total;
            const denominator = parentTotal > 0 ? parentTotal : 1;

            return (
              <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                <p className="font-medium">{d.label}</p>
                <p className="text-muted-foreground">
                  {formatRM(value)} ({((value / denominator) * 100).toFixed(0)}%)
                </p>
                {showCompare && (
                  <p className="text-[10px] text-muted-foreground">
                    Prev total: {formatRM(previousTotal)}
                  </p>
                )}
              </div>
            );
          }}
        />
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {formatRM(total)}
        </span>
      </div>
    </div>
  );
}

export function CategoryDonut({
  occurrences,
  previousMonthOccurrences,
  itemsById,
  selectedCategory,
  onCategorySelect,
  isCompact = false,
}: CategoryDonutProps) {
  const [showCompare, setShowCompare] = useState(false);

  const data = useMemo<ChartDatum[]>(() => {
    const map = new Map<Category, number>();
    for (const occ of occurrences) {
      const item = itemsById[occ.itemId];
      if (!item) continue;
      map.set(item.category, (map.get(item.category) ?? 0) + occ.amount);
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        label: categoryLabelMap[category] ?? category,
        amount,
        color: CATEGORY_COLORS[category],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [occurrences, itemsById]);

  const previousData = useMemo<ChartDatum[]>(() => {
    const map = new Map<Category, number>();
    for (const occ of previousMonthOccurrences) {
      const item = itemsById[occ.itemId];
      if (!item) continue;
      map.set(item.category, (map.get(item.category) ?? 0) + occ.amount);
    }

    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        label: categoryLabelMap[category] ?? category,
        amount,
        color: CATEGORY_COLORS[category],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [itemsById, previousMonthOccurrences]);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.amount, 0);
  const donutScale = isCompact ? COMPACT_DONUT_SIZE / BASE_DONUT_SIZE : 1;
  const donutBoxSize = isCompact ? COMPACT_DONUT_SIZE : BASE_DONUT_SIZE;
  const displayRows = showCompare ? mergeCategories(data, previousData) : data;
  const previousByCategory = new Map(previousData.map((entry) => [entry.category, entry.amount]));

  return (
    <motion.div layout="position" transition={LAYOUT_TRANSITION}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {showCompare ? "Outer ring: this month, inner ring: last month" : "Click a slice to filter calendar and upcoming"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px]"
          onClick={() => setShowCompare((value) => !value)}
        >
          {showCompare ? "Single" : "MoM"}
        </Button>
      </div>
      <motion.div
        layout
        className={cn(
          isCompact ? "flex items-center gap-3" : "flex flex-col items-center gap-6",
        )}
        transition={LAYOUT_TRANSITION}
      >
        <motion.div
          layout
          animate={{ width: donutBoxSize, height: donutBoxSize }}
          transition={SIZE_TRANSITION}
          className="relative shrink-0 overflow-x-hidden"
        >
          <motion.div
            animate={{ scale: donutScale }}
            transition={SIZE_TRANSITION}
            className="absolute inset-0 flex items-center justify-center origin-center will-change-transform"
            style={{ transformOrigin: "50% 50%" }}
          >
            <DonutLayer
              data={data}
              compareData={previousData}
              total={total}
              selectedCategory={selectedCategory}
              onCategorySelect={onCategorySelect}
              showCompare={showCompare}
            />
          </motion.div>
        </motion.div>
        <motion.div
          layout
          transition={LAYOUT_TRANSITION}
          className={`flex min-w-0 flex-col gap-1.5 ${isCompact ? "flex-1" : "w-full"}`}
        >
          {displayRows.slice(0, 5).map((d) => {
            const isSelected = selectedCategory === d.category;
            const previousValue = previousByCategory.get(d.category) ?? 0;
            const trend = previousValue > 0 ? ((d.amount - previousValue) / previousValue) * 100 : null;

            return (
              <motion.button
                layout="position"
                key={d.category}
                type="button"
                onClick={() => onCategorySelect(isSelected ? null : d.category)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-sm px-1 py-0.5 text-xs text-left transition-colors",
                  isSelected && "bg-muted",
                )}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className={cn("truncate", isCompact ? "" : "text-sm text-foreground")}>
                    {d.label}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    isCompact ? "text-muted-foreground" : "text-sm text-muted-foreground",
                  )}
                >
                  {formatRM(d.amount)}
                  {showCompare && trend !== null && (
                    <span className={cn("ml-1 text-[10px]", trend >= 0 ? "text-red-500" : "text-green-600")}>
                      {trend >= 0 ? "+" : ""}
                      {trend.toFixed(0)}%
                    </span>
                  )}
                </span>
              </motion.button>
            );
          })}
          {displayRows.length > 5 && (
            <p className="mt-1 text-center text-[10px] text-muted-foreground">
              +{displayRows.length - 5} more
            </p>
          )}
          {selectedCategory && (
            <button
              type="button"
              onClick={() => onCategorySelect(null)}
              className="mt-2 text-[10px] text-muted-foreground underline underline-offset-2"
            >
              Clear filter
            </button>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
