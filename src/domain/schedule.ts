import type { Item, Occurrence, OccurrenceStatus } from "@/domain/types";
import { toLocalDateKey } from "@/lib/utils/date";

function startOfDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(value: Date): string {
  return toLocalDateKey(value);
}

function addByCycle(date: Date, cycle: Item["billingCycle"]): Date {
  const next = new Date(date);
  if (cycle === "weekly") next.setDate(next.getDate() + 7);
  if (cycle === "biweekly") next.setDate(next.getDate() + 14);
  if (cycle === "monthly") next.setMonth(next.getMonth() + 1);
  if (cycle === "yearly") next.setFullYear(next.getFullYear() + 1);
  return next;
}

function withBillingDay(date: Date, billingDay: number): Date {
  const d = new Date(date);
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(billingDay, maxDay));
  return d;
}

function normalizeStart(item: Item): Date {
  return withBillingDay(startOfDay(new Date(item.startDate)), item.billingDay);
}

function getStatus(date: Date, paid: boolean): OccurrenceStatus {
  if (paid) return "paid";
  return date < startOfDay(new Date()) ? "missed" : "upcoming";
}

export function getOccurrencesForMonth(
  items: Item[],
  year: number,
  month: number
): Occurrence[] {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return getOccurrencesInRange(items, from, to);
}

export function getOccurrencesInRange(
  items: Item[],
  from: Date,
  to: Date
): Occurrence[] {
  const results: Occurrence[] = [];
  const min = startOfDay(from);
  const max = startOfDay(to);

  for (const item of items) {
    if (!item.isActive) continue;
    let cursor = normalizeStart(item);
    let installmentIndex = 0;
    const maxIterations = 1000;

    for (let i = 0; i < maxIterations; i += 1) {
      if (cursor > max) break;

      let paid = item.paidDates.includes(toISODate(cursor));
      if (item.type === "bnpl") {
        if (item.totalInstallments === null) break;
        if (installmentIndex >= item.totalInstallments) break;
        paid = installmentIndex < item.installmentsPaid || paid;
      }

      if (cursor >= min && cursor <= max) {
        results.push({
          itemId: item.id,
          date: toISODate(cursor),
          amount: item.amount,
          status: getStatus(cursor, paid),
        });
      }

      installmentIndex += 1;
      cursor = withBillingDay(addByCycle(cursor, item.billingCycle), item.billingDay);
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

export function getNextDueDate(item: Item, fromDate = new Date()): string | null {
  if (!item.isActive) return null;

  let cursor = normalizeStart(item);
  let installmentIndex = 0;
  const pivot = startOfDay(fromDate);
  const maxIterations = 1000;

  for (let i = 0; i < maxIterations; i += 1) {
    if (item.type === "bnpl" && item.totalInstallments !== null) {
      if (installmentIndex >= item.totalInstallments) return null;
      const paid = installmentIndex < item.installmentsPaid;
      if (!paid && cursor >= pivot) return toISODate(cursor);
      installmentIndex += 1;
    } else {
      if (!item.paidDates.includes(toISODate(cursor)) && cursor >= pivot) {
        return toISODate(cursor);
      }
    }

    cursor = withBillingDay(addByCycle(cursor, item.billingCycle), item.billingDay);
  }

  return null;
}

export function isDueOnDate(item: Item, date: string): boolean {
  return getNextDueDate(item, new Date(date)) === date;
}

