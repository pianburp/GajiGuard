import * as itemRepo from "@/lib/repositories/item.repository";
import {
  toItem,
  markBnplPaid,
  markSubscriptionPaid,
} from "@/domain/item";
import type { Item } from "@/domain/types";

/** Get all items for a user, mapped to domain types. */
export async function getItemsByUserId(userId: string): Promise<Item[]> {
  const rows = await itemRepo.findByUserId(userId);
  return rows.map(toItem);
}

/** Create or update an item. */
export async function upsertItem(userId: string, data: Item): Promise<void> {
  const existing = await itemRepo.findById(data.id);

  if (existing) {
    // Ownership check — prevent IDOR
    if (existing.userId !== userId) {
      throw new Error("Forbidden");
    }

    await itemRepo.update(data.id, {
      type: data.type,
      name: data.name,
      brandIconUrl: data.brandIconUrl,
      amount: data.amount,
      currency: data.currency,
      billingCycle: data.billingCycle,
      billingDay: data.billingDay,
      startDate: data.startDate,
      category: data.category,
      color: data.color,
      notes: data.notes,
      isActive: data.isActive,
      isShariah: data.isShariah,
      interestRate: data.interestRate,
      totalInstallments: data.totalInstallments,
      installmentsPaid: data.installmentsPaid,
      paidDates: data.paidDates,
    });
  } else {
    await itemRepo.insert(userId, data);
  }
}

/** Mark an item as paid for a given date. Returns the updated Item or null. */
export async function markItemPaid(
  itemId: string,
  date: string,
  userId: string,
): Promise<Item | null> {
  const row = await itemRepo.findById(itemId);
  if (!row) return null;

  // Ownership check — prevent IDOR
  if (row.userId !== userId) return null;

  if (row.type === "bnpl") {
    const changes = markBnplPaid(row);
    await itemRepo.update(itemId, changes);
  } else {
    const changes = markSubscriptionPaid(row, date);
    if (changes) {
      await itemRepo.update(itemId, changes);
    }
  }

  const updated = await itemRepo.findById(itemId);
  return updated ? toItem(updated) : null;
}

/** Delete an item. Returns false if the item doesn't exist or user doesn't own it. */
export async function deleteItem(
  itemId: string,
  userId: string,
): Promise<boolean> {
  const row = await itemRepo.findById(itemId);
  if (!row) return false;

  // Ownership check — prevent IDOR
  if (row.userId !== userId) return false;

  await itemRepo.deleteById(itemId);
  return true;
}
