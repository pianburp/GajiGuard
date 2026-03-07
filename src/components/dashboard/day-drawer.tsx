import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRM } from "@/lib/utils/format";
import { calculateAnnualSavings } from "@/lib/domain/item";
import type { Item, Occurrence } from "@/lib/domain/types";
import { Check, Pencil, Trash2, CreditCard, Package, Calendar, DollarSign } from "lucide-react";
import { BrandIcon } from "@/components/dashboard/brand-icon";
import { cn } from "@/lib/utils/cn";

interface DayDrawerProps {
  date: string | null;
  open: boolean;
  occurrences: Occurrence[];
  itemsById: Record<string, Item>;
  onClose: () => void;
  onMarkPaid: (itemId: string, date: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (itemId: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DayDrawer({
  date,
  open,
  occurrences,
  itemsById,
  onClose,
  onMarkPaid,
  onEdit,
  onDelete,
}: DayDrawerProps) {
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const totalDue = occurrences
    .filter((o) => o.status !== "paid")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="space-y-2 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wide">Payment Date</span>
          </div>
          <SheetTitle className="text-left text-xl font-semibold">{date ? formatDate(date) : ""}</SheetTitle>
          <SheetDescription className="text-left">
            {occurrences.length === 0
              ? "No payments due on this date."
              : `${occurrences.length} payment${occurrences.length !== 1 ? "s" : ""} due`}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <ScrollArea className="h-[calc(100vh-280px)] py-4">
          {occurrences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Calendar className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm">Nothing due on this day.</p>
              <p className="text-xs text-muted-foreground">Select another date to view payments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {occurrences.map((occurrence, idx) => {
                const item = itemsById[occurrence.itemId];
                if (!item) return null;

                const isPaid = occurrence.status === "paid";
                const isMissed = occurrence.status === "missed";
                const isBnpl = item.type === "bnpl";

                return (
                  <div
                    key={`${occurrence.itemId}-${idx}`}
                    className="rounded-lg border bg-card p-4 transition-colors duration-150"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {item.brandIconUrl ? (
                            <BrandIcon
                              name={item.name}
                              iconUrl={item.brandIconUrl}
                              className="h-5 w-5 rounded-[5px]"
                            />
                          ) : (
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          <h4
                            className={cn(
                              "truncate font-medium",
                              isPaid && "text-muted-foreground line-through",
                            )}
                          >
                            {item.name}
                          </h4>
                          {isMissed && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-destructive"
                              aria-label="Missed payment"
                              title="Missed payment"
                            />
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="gap-1 text-xs font-normal">
                            {isBnpl ? (
                              <Package className="h-3 w-3" />
                            ) : (
                              <CreditCard className="h-3 w-3" />
                            )}
                            {isBnpl ? "BNPL" : "Subscription"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">
                          {formatRM(occurrence.amount)}
                        </p>
                      </div>
                    </div>

                    {isBnpl && item.totalInstallments && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>
                            {item.installmentsPaid}/{item.totalInstallments} paid
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-foreground transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                (item.installmentsPaid / item.totalInstallments) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        onClick={() => onMarkPaid(item.id, date!)}
                        disabled={isPaid}
                        aria-label={isPaid ? "Paid" : "Mark paid"}
                        title={isPaid ? "Paid" : "Mark paid"}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        onClick={() => onEdit(item)}
                        aria-label="Edit subscription"
                        title="Edit subscription"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(item)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Delete subscription"
                        title="Delete subscription"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {occurrences.length > 0 && totalDue > 0 && (
          <>
            <Separator className="mb-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Due</span>
              <span className="text-xl font-semibold tabular-nums">{formatRM(totalDue)}</span>
            </div>
          </>
        )}
      </SheetContent>

      {/* Delete confirmation dialog with savings projection */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently remove this item and all its payment history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {/* How Much Saved — savings projection */}
          {deleteTarget && (() => {
            const { annual, monthly } = calculateAnnualSavings(deleteTarget);
            if (annual <= 0) return null;
            return (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/40">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Jimat Berapa?
                  </p>
                </div>
                <p className="mt-1.5 text-sm text-green-700 dark:text-green-300">
                  By canceling <strong>{deleteTarget.name}</strong>, you could save
                  <strong> {formatRM(annual)}</strong> a year!
                  {monthly > 0 && (
                    <span className="text-green-600 dark:text-green-400">
                      {" "}({formatRM(monthly)}/month)
                    </span>
                  )}
                </p>
              </div>
            );
          })()}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete}>
              Yes, delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
