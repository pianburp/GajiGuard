"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { calculateAnnualSavings } from "@/lib/domain/item";
import { formatRM } from "@/lib/utils/format";
import type { Item } from "@/lib/domain/types";
import { ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { BrandIcon } from "@/components/dashboard/brand-icon";

interface SavingsOverviewProps {
  items: Item[];
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const PANEL_TRANSITION = {
  type: "spring" as const,
  stiffness: 260,
  damping: 30,
  mass: 0.85,
};

export function SavingsOverview({ items, isExpanded, onExpandedChange }: SavingsOverviewProps) {

  const rows = useMemo(() => {
    return items
      .filter((item) => item.isActive)
      .map((item) => {
        const { annual } = calculateAnnualSavings(item);
        return { item, annual };
      })
      .filter((r) => r.annual > 0)
      .sort((a, b) => b.annual - a.annual);
  }, [items]);

  const totalAnnual = useMemo(
    () => rows.reduce((s, r) => s + r.annual, 0),
    [rows],
  );

  if (rows.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => onExpandedChange(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="savings-overview-panel"
        className="flex w-full items-center justify-between text-xs"
      >
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          Potensi Jimat
        </span>
        <span className="flex items-center gap-1">
          <span className="font-semibold tabular-nums text-green-600">
            {formatRM(totalAnnual)}/annum
          </span>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      </button>

      <motion.div
        id="savings-overview-panel"
        initial={false}
        animate={{
          height: isExpanded ? "auto" : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{
          height: PANEL_TRANSITION,
          opacity: { duration: 0.18, ease: "easeOut" },
        }}
        style={{ pointerEvents: isExpanded ? "auto" : "none" }}
        aria-hidden={!isExpanded}
        className="overflow-hidden"
      >
        <div className="space-y-1.5 pt-2">
          {rows.map(({ item, annual }) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs"
            >
              <span className="flex items-center gap-1.5 truncate">
                {item.brandIconUrl ? (
                  <BrandIcon
                    name={item.name}
                    iconUrl={item.brandIconUrl}
                    className="h-3.5 w-3.5 rounded-[3px]"
                  />
                ) : (
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-green-600">
                {formatRM(annual)}/annum
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div >
  );
}
