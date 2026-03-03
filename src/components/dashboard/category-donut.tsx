"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { CATEGORY_COLORS, CATEGORY_OPTIONS } from "@/lib/constants";
import { formatRM } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Item, Occurrence, Category } from "@/lib/domain/types";

interface CategoryDonutProps {
  occurrences: Occurrence[];
  itemsById: Record<string, Item>;
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
  total: number;
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

function DonutLayer({
  data,
  total,
}: DonutLayerProps) {
  return (
    <div className="relative" style={{ width: BASE_DONUT_SIZE, height: BASE_DONUT_SIZE }}>
      <PieChart width={BASE_DONUT_SIZE} height={BASE_DONUT_SIZE}>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            strokeWidth={2}
            stroke="var(--background)"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.category} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as ChartDatum;
              return (
                <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                  <p className="font-medium">{d.label}</p>
                  <p className="text-muted-foreground">
                    {formatRM(d.amount)} ({((d.amount / total) * 100).toFixed(0)}%)
                  </p>
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

export function CategoryDonut({ occurrences, itemsById, isCompact = false }: CategoryDonutProps) {
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

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.amount, 0);
  const donutScale = isCompact ? COMPACT_DONUT_SIZE / BASE_DONUT_SIZE : 1;
  const donutBoxSize = isCompact ? COMPACT_DONUT_SIZE : BASE_DONUT_SIZE;

  return (
    <motion.div layout="position" transition={LAYOUT_TRANSITION}>
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
            <DonutLayer data={data} total={total} />
          </motion.div>
        </motion.div>
        <motion.div
          layout
          transition={LAYOUT_TRANSITION}
          className={`flex min-w-0 flex-col gap-1.5 ${isCompact ? "flex-1" : "w-full"}`}
        >
          {data.slice(0, 5).map((d) => (
            <motion.div layout="position" key={d.category} className="flex items-center justify-between gap-2 text-xs">
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
              </span>
            </motion.div>
          ))}
          {data.length > 5 && (
            <p className="mt-1 text-center text-[10px] text-muted-foreground">
              +{data.length - 5} more
            </p>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
