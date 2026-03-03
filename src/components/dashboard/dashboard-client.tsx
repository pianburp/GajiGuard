"use client";

import { useMemo, useState, useCallback } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { DayDrawer } from "@/components/dashboard/day-drawer";
import { ItemForm } from "@/components/dashboard/item-form";
import { UpcomingSidebar } from "@/components/dashboard/upcoming-sidebar";
import { AnalyticsBento } from "@/components/dashboard/analytics-bento";
import { DonationNudge } from "@/components/dashboard/donation-nudge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { getOccurrencesForMonth } from "@/lib/domain/schedule";
import { upsertItem, markItemPaid, deleteItem, setBudget } from "@/app/actions";
import { formatRM } from "@/lib/format";

import type { Item } from "@/lib/domain/types";
import {
  Plus,
  CalendarFold,
  AlertTriangle,
  X,
} from "lucide-react";

interface DashboardClientProps {
  isAuthenticated: boolean;
  initialItems?: Item[];
  initialBudget?: number | null;
}

export function DashboardClient({
  isAuthenticated,
  initialItems = [],
  initialBudget = null,
}: DashboardClientProps) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [budget, setBudgetState] = useState<number | null>(initialBudget);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [formNonce, setFormNonce] = useState(0);
  const [overdueDismissed, setOverdueDismissed] = useState(false);


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

  const fullMonthlyTotal = useMemo(
    () => occurrences.reduce((acc, curr) => acc + curr.amount, 0),
    [occurrences],
  );

  const previousMonthTotal = useMemo(() => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() - 1);
    const prevOccurrences = getOccurrencesForMonth(
      items,
      d.getFullYear(),
      d.getMonth(),
    );
    return prevOccurrences
      .filter((o) => o.status !== "paid")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [items, monthDate]);

  const overdueInfo = useMemo(() => {
    const missed = occurrences.filter((o) => o.status === "missed");
    return {
      count: missed.length,
      total: missed.reduce((acc, curr) => acc + curr.amount, 0),
    };
  }, [occurrences]);

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
    setEditItem(null);
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }, [isAuthenticated]);

  const onSetBudget = useCallback(
    async (amount: number | null) => {
      if (!isAuthenticated) {
        signInWithGoogle();
        return;
      }
      const prev = budget;
      setBudgetState(amount);
      try {
        await setBudget(amount);
      } catch {
        setBudgetState(prev);
      }
    },
    [isAuthenticated, budget],
  );

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

  const onDelete = useCallback(
    async (itemId: string) => {
      if (!isAuthenticated) {
        signInWithGoogle();
        return;
      }

      // Optimistic removal
      const prev = items;
      setItems((current) => current.filter((item) => item.id !== itemId));
      setSelectedDate(null);

      try {
        const ok = await deleteItem(itemId);
        if (!ok) setItems(prev);
      } catch {
        setItems(prev);
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

      {/* Overdue Alert Banner */}
      {isAuthenticated && overdueInfo.count > 0 && !overdueDismissed && (
        <Alert variant="destructive" className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have <strong>{overdueInfo.count}</strong> overdue{" "}
                {overdueInfo.count === 1 ? "payment" : "payments"} totalling{" "}
                <strong>{formatRM(overdueInfo.total)}</strong>
              </AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/20"
              onClick={() => setOverdueDismissed(true)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Alert>
      )}

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
          previousMonthTotal={previousMonthTotal}
          occurrences={occurrences}
          itemsById={itemsById}
        />
      </div>
      <AnalyticsBento
        items={items}
        occurrences={occurrences}
        itemsById={itemsById}
        budget={budget}
        onSetBudget={onSetBudget}
        monthDate={monthDate}
      />

      {/* Donation nudge — shown after user has tracked a few items */}
      {isAuthenticated && (
        <DonationNudge
          itemCount={items.length}
          totalMonthlyCost={fullMonthlyTotal}
        />
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
        onDelete={onDelete}
      />
    </div>
  );
}
