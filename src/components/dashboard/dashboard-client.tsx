"use client";

import { useMemo, useState, useCallback, useRef, useTransition } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { DayDrawer } from "@/components/dashboard/day-drawer";
import { ItemForm } from "@/components/dashboard/item-form";
import type { ItemDraft } from "@/components/dashboard/item-form";
import { UpcomingSidebar } from "@/components/dashboard/upcoming-sidebar";
import { AnalyticsBento } from "@/components/dashboard/analytics-bento";
import { DonationNudge } from "@/components/dashboard/donation-nudge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { GajiCountdown } from "@/components/dashboard/gaji-countdown";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  deleteItem,
  getDashboardData,
  markItemPaid,
  setBudget,
  setGajiDay as setGajiDayAction,
  upsertItem,
} from "@/actions";
import { formatRM } from "@/lib/utils/format";
import type { DashboardData } from "@/domain/dashboard";
import type { Category, Item } from "@/domain/types";
import { getOccurrencesForMonth, getOccurrencesInRange } from "@/domain/schedule";
import { CATEGORY_OPTIONS } from "@/lib/config/constants";
import { Plus, CalendarFold, AlertTriangle, X } from "lucide-react";

interface DashboardClientProps {
  isAuthenticated: boolean;
  initialDashboardData: DashboardData | null;
  initialYear: number;
  initialMonth: number;
}

export function DashboardClient({
  isAuthenticated,
  initialDashboardData,
  initialYear,
  initialMonth,
}: DashboardClientProps) {
  const [items, setItems] = useState<Item[]>(initialDashboardData?.items ?? []);
  const [occurrences, setOccurrences] = useState(initialDashboardData?.occurrences ?? []);
  const [healthRows, setHealthRows] = useState(initialDashboardData?.healthRows ?? []);
  const [suggestions, setSuggestions] = useState(initialDashboardData?.suggestions ?? []);
  const [auditSummary, setAuditSummary] = useState(initialDashboardData?.auditSummary ?? {
    keepCount: 0,
    reviewCount: 0,
    cancelCount: 0,
    reviewSavings: 0,
    cancelSavings: 0,
    inactiveCount: 0,
  });
  const [heatmap, setHeatmap] = useState(initialDashboardData?.heatmap ?? []);
  const [budget, setBudgetState] = useState<number | null>(initialDashboardData?.budget ?? null);
  const [budgetStatus, setBudgetStatus] = useState(
    initialDashboardData?.budgetStatus ?? {
      spent: 0,
      remaining: null,
      overBudget: false,
    },
  );
  const [monthlyTotal, setMonthlyTotal] = useState(initialDashboardData?.monthlyTotal ?? 0);
  const [previousMonthTotal, setPreviousMonthTotal] = useState(
    initialDashboardData?.previousMonthTotal ?? 0,
  );
  const [gajiDay, setGajiDayState] = useState<number>(initialDashboardData?.gajiDay ?? 25);
  const [monthDate, setMonthDate] = useState(() => new Date(initialYear, initialMonth, 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [formPrefill, setFormPrefill] = useState<Partial<ItemDraft> | undefined>(undefined);
  const [formNonce, setFormNonce] = useState(0);
  const [overdueDismissed, setOverdueDismissed] = useState(false);
  const [, startTransition] = useTransition();
  const latestLoadIdRef = useRef(0);

  const itemsById = Object.fromEntries(items.map((item) => [item.id, item]));

  const filteredOccurrences = useMemo(() => {
    if (!selectedCategory) return occurrences;
    return occurrences.filter((occurrence) => {
      const item = itemsById[occurrence.itemId];
      return item?.category === selectedCategory;
    });
  }, [itemsById, occurrences, selectedCategory]);

  const dayOccurrences = useMemo(
    () => filteredOccurrences.filter((o) => o.date === selectedDate),
    [filteredOccurrences, selectedDate],
  );

  const fullMonthlyTotal = useMemo(
    () => occurrences.reduce((acc, curr) => acc + curr.amount, 0),
    [occurrences],
  );

  const overdueInfo = useMemo(() => {
    const missed = occurrences.filter((o) => o.status === "missed");
    return {
      count: missed.length,
      total: missed.reduce((acc, curr) => acc + curr.amount, 0),
    };
  }, [occurrences]);

  const budgetHistory = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const monthOffset = 5 - index;
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth() - monthOffset, 1);
      const monthOccurrences = getOccurrencesForMonth(items, date.getFullYear(), date.getMonth());
      const spent = monthOccurrences
        .filter((occurrence) => occurrence.status !== "paid")
        .reduce((sum, occurrence) => sum + occurrence.amount, 0);
      return {
        monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        monthLabel: date.toLocaleDateString(undefined, { month: "short" }),
        spent,
      };
    });
  }, [items, monthDate]);

  const previousMonthOccurrences = useMemo(() => {
    const previousMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
    return getOccurrencesForMonth(items, previousMonth.getFullYear(), previousMonth.getMonth());
  }, [items, monthDate]);

  const billsBeforePayday = useMemo(() => {
    const normalizeDate = (value: Date) => {
      const d = new Date(value);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const buildPayday = (year: number, month: number, day: number) => {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(day, lastDay));
    };

    const today = normalizeDate(new Date());
    const currentPayday = normalizeDate(buildPayday(today.getFullYear(), today.getMonth(), gajiDay));
    const targetPayday =
      currentPayday >= today
        ? currentPayday
        : normalizeDate(buildPayday(today.getFullYear(), today.getMonth() + 1, gajiDay));

    if (targetPayday.getTime() === today.getTime()) {
      return { count: 0, total: 0 };
    }

    const dayBeforePayday = new Date(targetPayday);
    dayBeforePayday.setDate(dayBeforePayday.getDate() - 1);
    const dueBeforePayday = getOccurrencesInRange(items, today, dayBeforePayday)
      .filter((occurrence) => occurrence.status !== "paid");

    return {
      count: dueBeforePayday.length,
      total: dueBeforePayday.reduce((sum, occurrence) => sum + occurrence.amount, 0),
    };
  }, [gajiDay, items]);

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategory) return null;
    return (
      CATEGORY_OPTIONS.find((option) => option.value === selectedCategory)?.label ?? selectedCategory
    );
  }, [selectedCategory]);

  const signInWithGoogle = () => {
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const applyDashboardData = useCallback((data: DashboardData) => {
    setItems(data.items);
    setOccurrences(data.occurrences);
    setHealthRows(data.healthRows);
    setSuggestions(data.suggestions);
    setAuditSummary(data.auditSummary);
    setHeatmap(data.heatmap);
    setBudgetState(data.budget);
    setBudgetStatus(data.budgetStatus);
    setMonthlyTotal(data.monthlyTotal);
    setPreviousMonthTotal(data.previousMonthTotal);
    setGajiDayState(data.gajiDay);
    setOverdueDismissed(false);
  }, []);

  const loadDashboardMonth = useCallback(
    (date: Date) => {
      if (!isAuthenticated) {
        setMonthDate(date);
        return;
      }

      const year = date.getFullYear();
      const month = date.getMonth();
      const loadId = latestLoadIdRef.current + 1;
      latestLoadIdRef.current = loadId;
      setMonthDate(date);

      startTransition(() => {
        void getDashboardData(year, month)
          .then((data) => {
            if (latestLoadIdRef.current !== loadId) return;
            applyDashboardData(data);
            setSelectedDate(null);
          })
          .catch(() => undefined);
      });
    },
    [applyDashboardData, isAuthenticated, startTransition],
  );

  const refreshDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;
    const data = await getDashboardData(
      monthDate.getFullYear(),
      monthDate.getMonth(),
    );
    applyDashboardData(data);
  }, [applyDashboardData, isAuthenticated, monthDate]);

  const onAddClick = useCallback(() => {
    if (!isAuthenticated) {
      signInWithGoogle();
      return;
    }
    setEditItem(null);
    setFormPrefill(undefined);
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }, [isAuthenticated]);

  const onQuickAdd = useCallback(
    (template: Partial<ItemDraft>) => {
      if (!isAuthenticated) {
        signInWithGoogle();
        return;
      }
      setEditItem(null);
      setFormPrefill(template);
      setFormNonce((n) => n + 1);
      setFormOpen(true);
    },
    [isAuthenticated],
  );

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
        await refreshDashboardData();
      } catch {
        setBudgetState(prev);
      }
    },
    [budget, isAuthenticated, refreshDashboardData],
  );

  const onSetGajiDay = useCallback(
    async (day: number) => {
      if (!isAuthenticated) {
        signInWithGoogle();
        return;
      }
      const prev = gajiDay;
      setGajiDayState(day);
      try {
        await setGajiDayAction(day);
      } catch {
        setGajiDayState(prev);
      }
    },
    [gajiDay, isAuthenticated],
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
        await refreshDashboardData();
      } catch {
        setItems(items);
      }
    },
    [isAuthenticated, items, refreshDashboardData],
  );

  const onMarkPaid = useCallback(
    async (itemId: string, date: string) => {
      if (!isAuthenticated) {
        signInWithGoogle();
        return;
      }

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
        await refreshDashboardData();
      } catch {
        setItems(items);
      }
    },
    [isAuthenticated, items, refreshDashboardData],
  );

  const onDelete = useCallback(
    async (itemId: string) => {
      if (!isAuthenticated) {
        signInWithGoogle();
        return;
      }

      const prev = items;
      setItems((current) => current.filter((item) => item.id !== itemId));
      setSelectedDate(null);

      try {
        const ok = await deleteItem(itemId);
        if (!ok) {
          setItems(prev);
          return;
        }
        await refreshDashboardData();
      } catch {
        setItems(prev);
      }
    },
    [isAuthenticated, items, refreshDashboardData],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarFold className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAuthenticated ? (
              <span className="flex items-center gap-2">
                <span>
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
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

      {items.length === 0 ? (
        <EmptyState onQuickAdd={onQuickAdd} />
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
            <CalendarView
              monthDate={monthDate}
              selectedDate={selectedDate}
              occurrences={filteredOccurrences}
              itemsById={itemsById}
              onMonthChange={loadDashboardMonth}
              onSelectDate={(date) => setSelectedDate(date)}
              onMarkPaid={onMarkPaid}
            />
            <div className="space-y-4">
              <GajiCountdown
                gajiDay={gajiDay}
                onSetGajiDay={onSetGajiDay}
                billsBeforePayday={billsBeforePayday}
              />
              <UpcomingSidebar
                monthlyTotal={monthlyTotal}
                previousMonthTotal={previousMonthTotal}
                occurrences={filteredOccurrences}
                itemsById={itemsById}
                categoryFilterLabel={selectedCategoryLabel}
                onClearCategoryFilter={() => setSelectedCategory(null)}
              />
            </div>
          </div>
          <AnalyticsBento
            items={items}
            occurrences={occurrences}
            itemsById={itemsById}
            budget={budget}
            budgetStatus={budgetStatus}
            onSetBudget={onSetBudget}
            monthDate={monthDate}
            budgetHistory={budgetHistory}
            previousMonthOccurrences={previousMonthOccurrences}
            categoryFilter={selectedCategory}
            onCategoryFilterChange={setSelectedCategory}
            healthRows={healthRows}
            suggestions={suggestions}
            auditSummary={auditSummary}
            heatmap={heatmap}
          />

          {isAuthenticated && (
            <DonationNudge
              itemCount={items.length}
              totalMonthlyCost={fullMonthlyTotal}
            />
          )}
        </>
      )}

      <ItemForm
        key={`${editItem?.id ?? "new"}-${formNonce}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={onSave}
        editItem={editItem}
        prefill={formPrefill}
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
          setFormPrefill(undefined);
          setFormNonce((n) => n + 1);
          setFormOpen(true);
        }}
        onDelete={onDelete}
      />
    </div>
  );
}
