import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRM } from "@/lib/format";
import type { Item, Occurrence } from "@/lib/domain/types";
import { Check, Pencil, CreditCard, Package, Calendar } from "lucide-react";
import { BrandIcon } from "@/components/dashboard/brand-icon";

interface DayDrawerProps {
  date: string | null;
  open: boolean;
  occurrences: Occurrence[];
  itemsById: Record<string, Item>;
  onClose: () => void;
  onMarkPaid: (itemId: string, date: string) => void;
  onEdit: (item: Item) => void;
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
}: DayDrawerProps) {
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
                          <h4 className="truncate font-medium">{item.name}</h4>
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
                          <Badge
                            variant={
                              isPaid ? "secondary" : isMissed ? "destructive" : "default"
                            }
                            className="text-xs font-normal"
                          >
                            {occurrence.status}
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

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => onMarkPaid(item.id, date!)}
                        disabled={isPaid}
                        className="gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isPaid ? "Paid" : "Mark Paid"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(item)}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
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
    </Sheet>
  );
}
