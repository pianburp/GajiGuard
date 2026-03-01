import type { Item } from "@/lib/domain/types";

/** Row shape returned by Drizzle for the `item` table. */
export type ItemRow = {
  id: string;
  type: string;
  name: string;
  brandIconUrl: string | null;
  amount: number;
  currency: string;
  billingCycle: string;
  billingDay: number;
  startDate: string;
  category: string;
  color: string;
  notes: string;
  isActive: boolean;
  totalInstallments: number | null;
  installmentsPaid: number;
  paidDates: string[];
};

/** Map a raw DB row to the `Item` domain type. */
export function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    type: row.type as Item["type"],
    name: row.name,
    brandIconUrl: row.brandIconUrl,
    amount: row.amount,
    currency: row.currency as "MYR",
    billingCycle: row.billingCycle as Item["billingCycle"],
    billingDay: row.billingDay,
    startDate: row.startDate,
    category: row.category as Item["category"],
    color: row.color,
    notes: row.notes,
    isActive: row.isActive,
    totalInstallments: row.totalInstallments,
    installmentsPaid: row.installmentsPaid,
    paidDates: row.paidDates,
  };
}

/**
 * Compute updated fields when a BNPL item is marked as paid.
 * Returns only the fields that change.
 */
export function markBnplPaid(item: ItemRow): {
  installmentsPaid: number;
  isActive: boolean;
} {
  const paid = item.installmentsPaid + 1;
  const total = item.totalInstallments ?? paid;
  return {
    installmentsPaid: Math.min(paid, total),
    isActive: paid >= total ? false : item.isActive,
  };
}

/**
 * Compute updated `paidDates` when a subscription item is marked as paid.
 * Returns `null` if the date is already recorded (no-op).
 */
export function markSubscriptionPaid(
  item: ItemRow,
  date: string,
): { paidDates: string[] } | null {
  const paidDates = item.paidDates as string[];
  if (paidDates.includes(date)) return null;
  return { paidDates: [...paidDates, date] };
}

