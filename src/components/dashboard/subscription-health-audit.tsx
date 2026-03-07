"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRM } from "@/lib/utils/format";
import type { AuditSummary, SubscriptionHealthRow, SubscriptionHealthStatus } from "@/lib/domain/insights";

interface SubscriptionHealthAuditProps {
  rows: SubscriptionHealthRow[];
  summary: AuditSummary;
}

function statusVariant(status: SubscriptionHealthStatus): "secondary" | "outline" | "destructive" {
  if (status === "cancel") return "destructive";
  if (status === "review") return "outline";
  return "secondary";
}

export function SubscriptionHealthAudit({ rows, summary }: SubscriptionHealthAuditProps) {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Subscription Health Check</CardTitle>
        <CardDescription className="text-xs">
          Score based on payment consistency and subscription frequency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">Keep: {summary.keepCount}</Badge>
          <Badge variant="outline" className="text-[10px]">Review: {summary.reviewCount}</Badge>
          <Badge variant="destructive" className="text-[10px]">Cancel: {summary.cancelCount}</Badge>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active subscriptions to audit.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.itemId} className="rounded-md border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{row.itemName}</p>
                  <Badge variant={statusVariant(row.status)} className="text-[10px] capitalize">
                    {row.status}
                  </Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Consistency: {(row.consistencyRate * 100).toFixed(0)}%</span>
                  <span>Missed streak: {row.consecutiveMissedMonths} months</span>
                  <span>~{formatRM(row.monthlyEquivalent)}/month</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {(summary.reviewSavings > 0 || summary.cancelSavings > 0) && (
          <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
            Potential yearly savings: review {formatRM(summary.reviewSavings)} + cancel {formatRM(summary.cancelSavings)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
