"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRM } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Target, Pencil, X, Check, AlertTriangle } from "lucide-react";

interface BudgetBarProps {
  budget: number | null;
  spent: number;
  onSetBudget: (amount: number | null) => void;
}

export function BudgetBar({ budget, spent, onSetBudget }: BudgetBarProps) {
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
      <button
        type="button"
        onClick={startEditing}
        className="flex w-full items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Target className="h-3.5 w-3.5" />
        <span>Set a monthly budget</span>
      </button>
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

  return (
    <div className="space-y-3">
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
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-300",
            overBudget
              ? "bg-red-500"
              : nearLimit
                ? "bg-amber-500"
                : "bg-green-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

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
    </div>
  );
}
