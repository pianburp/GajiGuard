"use client";

import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRM } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Target, Pencil, X, Check, AlertTriangle } from "lucide-react";

interface BudgetBarProps {
  budget: number | null;
  spent: number;
  history?: Array<{
    monthKey: string;
    monthLabel: string;
    spent: number;
  }>;
  onSetBudget: (amount: number | null) => void;
}

const SPARKLINE_WIDTH = 220;
const SPARKLINE_HEIGHT = 34;

function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length <= 1) return "";

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const step = width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * step;
      const normalized = (value - min) / range;
      const y = height - normalized * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function BudgetBar({ budget, spent, history = [], onSetBudget }: BudgetBarProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setDraft(budget?.toString() ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitBudget = () => {
    const num = parseFloat(draft);
    if (draft.trim() === "") {
      onSetBudget(null);
    } else if (!isNaN(num) && num > 0 && num <= 999999) {
      onSetBudget(num);
    }
    setEditing(false);
  };

  // No budget set — show CTA
  if (budget === null && !editing) {
    return (
      <motion.button
        type="button"
        onClick={startEditing}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Target className="h-3.5 w-3.5" />
        <span>Set a monthly budget</span>
      </motion.button>
    );
  }

  // Editing mode
  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">RM</span>
        <Input
          ref={inputRef}
          type="number"
          min={1}
          max={999999}
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitBudget();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-7 w-28 text-xs tabular-nums"
          placeholder="e.g. 500"
        />
        <Button size="icon-sm" variant="ghost" onClick={commitBudget}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // Budget set — show progress
  const pct = Math.min((spent / budget!) * 100, 100);
  const overBudget = spent > budget!;
  const nearLimit = pct >= 80 && !overBudget;
  const historyValues = history.map((entry) => entry.spent);
  const sparklinePath = buildSparklinePath(historyValues, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={startEditing}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
          <span className="tabular-nums">{formatRM(budget!)}</span>
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-1/2 w-px bg-background/80" />
        <div className="absolute inset-y-0 left-3/4 w-px bg-background/80" />
        <motion.div
          className={cn(
            "h-full",
            overBudget
              ? "bg-red-500"
              : nearLimit
                ? "bg-amber-500"
                : "bg-green-500",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>50%</span>
        <span>75%</span>
      </div>

      {history.length > 2 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">6-month trend</p>
          <svg
            viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
            role="img"
            aria-label="Budget usage trend"
            className="h-8 w-full overflow-visible"
          >
            <path
              d={sparklinePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="text-muted-foreground/70"
            />
          </svg>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{history[0]?.monthLabel}</span>
            <span>{history.at(-1)?.monthLabel}</span>
          </div>
        </div>
      )}

      {/* Labels */}
      <div className="flex items-center justify-between text-xs">
        <span className="tabular-nums">
          <span className={cn("font-medium", overBudget && "text-red-500")}>
            {formatRM(spent)}
          </span>
          <span className="text-muted-foreground"> / {formatRM(budget!)}</span>
        </span>
        {overBudget && (
          <span className="flex items-center gap-1 font-medium text-red-500">
            <AlertTriangle className="h-3 w-3" />
            Alamak!
          </span>
        )}
        {nearLimit && (
          <span className="flex items-center gap-1 font-medium text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            Hampir penuh!
          </span>
        )}
      </div>
    </motion.div>
  );
}
