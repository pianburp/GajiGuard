"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRM } from "@/lib/utils/format";
import type { HeatmapMonth } from "@/domain/insights";

interface RecurringCostHeatmapProps {
  year: number;
  months: HeatmapMonth[];
}

function levelClass(level: HeatmapMonth["level"]): string {
  if (level === 0) return "bg-muted text-muted-foreground";
  if (level === 1) return "bg-[#ff3b30]/20 text-foreground";
  if (level === 2) return "bg-[#ff3b30]/60 text-white";
  if (level === 3) return "bg-[#ff3b30]/80 text-white";
  return "bg-[#ff3b30] text-white";
}

export function RecurringCostHeatmap({ year, months }: RecurringCostHeatmapProps) {
  const highest = months.reduce(
    (peak, month) => (month.total > peak.total ? month : peak),
    months[0] ?? { monthLabel: "-", total: 0, month: 0, level: 0 as const },
  );

  return (
    <Card className="border bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Recurring Cost Heatmap</CardTitle>
        <CardDescription className="text-xs">
          Monthly commitment for {year}. Highest month: {highest.monthLabel} ({formatRM(highest.total)})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {months.map((month) => (
              <Tooltip key={month.month}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`flex h-16 w-full flex-col items-start justify-between rounded-md border border-border/50 p-2 transition hover:opacity-90 ${levelClass(month.level)}`}
                    aria-label={`${month.monthLabel} ${year}: ${formatRM(month.total)}`}
                  >
                    <span className="text-[11px] font-medium leading-none">{month.monthLabel}</span>
                    <span className="mt-auto text-[10px] font-medium tabular-nums tracking-tighter opacity-80">
                      {formatRM(month.total)}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{month.monthLabel} {year}</p>
                  <p>{formatRM(month.total)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Low</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={`inline-block h-3.5 w-3.5 rounded-[3px] border border-border/60 ${levelClass(level as HeatmapMonth["level"])}`}
            />
          ))}
          <span>High</span>
        </div>
      </CardContent>
    </Card>
  );
}

