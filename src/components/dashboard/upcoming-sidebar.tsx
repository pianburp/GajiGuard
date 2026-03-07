"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatRM, formatRelativeDate, formatShortDate } from "@/lib/format";
import type { Item, Occurrence } from "@/lib/domain/types";
import {
  Wallet,
  Clock,
  CreditCard,
  Package,
  TrendingUp,
  TrendingDown,
  Clipboard,
  Check,
} from "lucide-react";
import { BrandIcon } from "@/components/dashboard/brand-icon";
import { CATEGORY_OPTIONS } from "@/lib/constants";

interface UpcomingSidebarProps {
  monthlyTotal: number;
  previousMonthTotal: number;
  occurrences: Occurrence[];
  itemsById: Record<string, Item>;
}

export function UpcomingSidebar({
  monthlyTotal,
  previousMonthTotal,
  occurrences,
  itemsById,
}: UpcomingSidebarProps) {
  const [copied, setCopied] = useState(false);
  const categoryLabelByValue = Object.fromEntries(
    CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<Item["category"], string>;

  const upcoming = occurrences.filter((o) => o.status !== "paid").slice(0, 10);

  const totalPaid = occurrences
    .filter((o) => o.status === "paid")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-4 pb-2">
      {/* Monthly Summary Card */}
      <Card className="border bg-muted/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground/10">
              <Wallet className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Due This Month
                </p>
                {(() => {
                  if (previousMonthTotal === 0 && monthlyTotal === 0) return null;
                  if (previousMonthTotal === 0) {
                    return (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        New
                      </Badge>
                    );
                  }
                  const pctChange = ((monthlyTotal - previousMonthTotal) / previousMonthTotal) * 100;
                  const isUp = pctChange > 0;
                  return (
                    <Badge
                      variant="secondary"
                      className={`gap-0.5 text-[10px] font-normal ${
                        isUp ? "text-red-500" : "text-green-600"
                      }`}
                    >
                      {isUp ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(pctChange).toFixed(0)}%
                    </Badge>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatRM(monthlyTotal)}
                </p>
                <button
                  type="button"
                  aria-label="Copy total"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={async () => {
                    await navigator.clipboard.writeText(formatRM(monthlyTotal));
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
          {totalPaid > 0 && (
            <>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Already paid</span>
                <span className="font-medium text-green-600">{formatRM(totalPaid)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Monthly Spending Bar */}
      {(() => {
        const totalPaidAmt = totalPaid;
        const totalUpcoming = occurrences
          .filter((o) => o.status === "upcoming")
          .reduce((acc, curr) => acc + curr.amount, 0);
        const totalMissed = occurrences
          .filter((o) => o.status === "missed")
          .reduce((acc, curr) => acc + curr.amount, 0);
        const grandTotal = totalPaidAmt + totalUpcoming + totalMissed;

        if (grandTotal === 0) return null;

        const paidPct = (totalPaidAmt / grandTotal) * 100;
        const upcomingPct = (totalUpcoming / grandTotal) * 100;
        const missedPct = (totalMissed / grandTotal) * 100;

        return (
          <Card className="border bg-muted/30">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Monthly Breakdown</span>
                <span className="font-medium tabular-nums text-foreground">{formatRM(grandTotal)}</span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {paidPct > 0 && (
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${paidPct}%` }}
                  />
                )}
                {upcomingPct > 0 && (
                  <div
                    className="h-full bg-foreground/40 transition-all duration-300"
                    style={{ width: `${upcomingPct}%` }}
                  />
                )}
                {missedPct > 0 && (
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${missedPct}%` }}
                  />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                {totalPaidAmt > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    Paid {formatRM(totalPaidAmt)}
                  </span>
                )}
                {totalUpcoming > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-foreground/40" />
                    Upcoming {formatRM(totalUpcoming)}
                  </span>
                )}
                {totalMissed > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                    Overdue {formatRM(totalMissed)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Upcoming List */}
      <Card className="border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Upcoming</CardTitle>
          </div>
          <CardDescription className="text-xs">Next 10 payments due</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <div className="px-5 pb-5 text-sm text-muted-foreground">
              No upcoming payments this period.
            </div>
          ) : (
            <ScrollArea className="h-[16.5rem]">
              <div className="px-5">
                <div className="space-y-2 pb-3">
                  {upcoming.map((occurrence, idx) => {
                    const item = itemsById[occurrence.itemId];
                    if (!item) return null;

                    const isBnpl = item.type === "bnpl";
                    const categoryLabel = categoryLabelByValue[item.category] ?? "Other";
                    const progress = isBnpl && item.totalInstallments
                      ? Math.round((item.installmentsPaid / item.totalInstallments) * 100)
                      : null;

                    return (
                      <div
                        key={`${occurrence.itemId}-${idx}`}
                        className="group rounded-md border bg-card p-2.5 transition-colors duration-150 hover:bg-muted/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {item.brandIconUrl ? (
                                <BrandIcon
                                  name={item.name}
                                  iconUrl={item.brandIconUrl}
                                  className="h-4 w-4 rounded-[4px]"
                                />
                              ) : (
                                <div
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                              )}
                              <p className="truncate text-sm font-medium">{item.name}</p>
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              {isBnpl ? (
                                <>
                                  <Package className="h-3 w-3" />
                                  BNPL • {categoryLabel}
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-3 w-3" />
                                  Subscription • {categoryLabel}
                                </>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatRM(occurrence.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatShortDate(occurrence.date)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between">
                          <Badge
                            variant={occurrence.status === "missed" ? "destructive" : "secondary"}
                            className="text-[10px] font-normal"
                          >
                            {formatRelativeDate(occurrence.date)}
                          </Badge>

                          {isBnpl && item.totalInstallments && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.installmentsPaid}/{item.totalInstallments} paid
                            </span>
                          )}
                        </div>

                        {isBnpl && progress !== null && progress < 100 && (
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-foreground transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
