"use client";

import { useMemo, useState, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { DayDrawer } from "@/components/dashboard/day-drawer";
import { ItemForm } from "@/components/dashboard/item-form";
import { UpcomingSidebar } from "@/components/dashboard/upcoming-sidebar";
import { UpgradeDialog } from "@/components/dashboard/upgrade-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { FREE_ITEM_LIMIT } from "@/lib/constants";
import { getOccurrencesForMonth } from "@/lib/domain/schedule";
import { upsertItem, markItemPaid, upgradeUserPlan } from "@/actions";

import type { Item, PlanTier } from "@/lib/domain/types";
import {
  CalendarDays,
  Plus,
  CalendarFold,
} from "lucide-react";

interface DashboardClientProps {
  isAuthenticated: boolean;
  initialItems?: Item[];
  initialPlan?: PlanTier;
}

export function DashboardClient({
  isAuthenticated,
  initialItems = [],
  initialPlan = "free",
}: DashboardClientProps) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [plan, setPlan] = useState<PlanTier>(initialPlan);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [formNonce, setFormNonce] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);


  const occurrences = useMemo(
    () =>
      getOccurrencesForMonth(
        items,
        monthDate.getFullYear(),
        monthDate.getMonth(),
      ),
    [items, monthDate],
  );

  const itemsById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  const dayOccurrences = useMemo(
    () => occurrences.filter((o) => o.date === selectedDate),
    [occurrences, selectedDate],
  );

  const monthlyTotal = useMemo(
    () =>
      occurrences
        .filter((o) => o.status !== "paid")
        .reduce((acc, curr) => acc + curr.amount, 0),
    [occurrences],
  );

  const signInWithGoogle = () => {
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const onAddClick = useCallback(() => {
    if (!isAuthenticated) {
      signInWithGoogle();
      return;
    }
    if (plan === "free" && items.length >= FREE_ITEM_LIMIT) {
      setUpgradeOpen(true);
      return;
    }
    setEditItem(null);
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }, [isAuthenticated, plan, items.length]);

  const onSave = useCallback(
    async (item: Item) => {
      if (!isAuthenticated) {
        signInWithGoogle();
        return;
      }
      const exists = items.some((candidate) => candidate.id === item.id);
      const next = exists
        ? items.map((candidate) =>
          candidate.id === item.id ? item : candidate,
        )
        : [...items, item];
      setItems(next);

      try {
        await upsertItem(item);
      } catch {
        setItems(items);
      }
    },
    [isAuthenticated, items],
  );

  const onMarkPaid = useCallback(
    async (itemId: string, date: string) => {
      if (!isAuthenticated) {
        signInWithGoogle();
        return;
      }

      // Optimistic update
      const next = items.map((item) => {
        if (item.id !== itemId) return item;
        if (item.type === "bnpl") {
          const paid = item.installmentsPaid + 1;
          const totalInstallments = item.totalInstallments ?? paid;
          return {
            ...item,
            installmentsPaid: Math.min(paid, totalInstallments),
            isActive: paid >= totalInstallments ? false : item.isActive,
          };
        }
        if (item.paidDates.includes(date)) return item;
        return { ...item, paidDates: [...item.paidDates, date] };
      });
      setItems(next);

      try {
        const updated = await markItemPaid(itemId, date);
        if (updated) {
          setItems((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item)),
          );
        }
      } catch {
        setItems(items);
      }
    },
    [isAuthenticated, items],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarFold className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAuthenticated ? (
              <span className="flex items-center gap-2">
                Plan:
                <Badge
                  variant={plan === "pro" ? "pro" : "secondary"}
                  className="text-xs font-normal uppercase"
                >
                  {plan}
                </Badge>
                <span className="text-border">|</span>
                <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
              </span>
            ) : (
              "Guest preview mode"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onAddClick} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
        <CalendarView
          monthDate={monthDate}
          selectedDate={selectedDate}
          occurrences={occurrences}
          itemsById={itemsById}
          onMonthChange={setMonthDate}
          onSelectDate={(date) => setSelectedDate(date)}
        />
        <UpcomingSidebar
          monthlyTotal={monthlyTotal}
          occurrences={occurrences}
          itemsById={itemsById}
        />
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <Card className="mt-6 border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-semibold">No subscriptions yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add your first subscription or BNPL commitment to start tracking
              your monthly payments.
            </p>
            <Button onClick={onAddClick} className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              Add your first item
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ItemForm
        key={`${editItem?.id ?? "new"}-${formNonce}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={onSave}
        editItem={editItem}
      />
      <DayDrawer
        open={Boolean(selectedDate)}
        date={selectedDate}
        occurrences={dayOccurrences}
        itemsById={itemsById}
        onClose={() => setSelectedDate(null)}
        onMarkPaid={onMarkPaid}
        onEdit={(item) => {
          if (!isAuthenticated) {
            signInWithGoogle();
            return;
          }
          setEditItem(item);
          setFormNonce((n) => n + 1);
          setFormOpen(true);
        }}
      />
      <UpgradeDialog
        open={upgradeOpen}
        itemCount={items.length}
        onClose={() => setUpgradeOpen(false)}
        onUpgrade={async () => {
          if (!isAuthenticated) {
            signInWithGoogle();
            return;
          }
          setPlan("pro");
          setUpgradeOpen(false);
          try {
            await upgradeUserPlan();
          } catch {
            setPlan("free");
          }
        }}
      />
    </div>
  );
}
