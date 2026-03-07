import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { item as itemTable } from "@/lib/db/schema";
import type { Item } from "@/lib/domain/types";

/** Find all items belonging to a user. */
export async function findByUserId(userId: string) {
  return db.select().from(itemTable).where(eq(itemTable.userId, userId));
}

/** Find a single item by its primary key. */
export async function findById(id: string) {
  const rows = await db
    .select()
    .from(itemTable)
    .where(eq(itemTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Check whether an item with the given id exists. */
export async function existsById(id: string): Promise<boolean> {
  const rows = await db
    .select({ id: itemTable.id })
    .from(itemTable)
    .where(eq(itemTable.id, id))
    .limit(1);
  return rows.length > 0;
}

/** Insert a new item row. */
export async function insert(userId: string, data: Item) {
  await db.insert(itemTable).values({
    id: data.id,
    userId,
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
}

/** Update an existing item row. */
export async function update(
  id: string,
  data: Partial<Omit<Item, "id">>,
) {
  await db
    .update(itemTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(itemTable.id, id));
}

/** Delete an item by its primary key. */
export async function deleteById(id: string) {
  await db.delete(itemTable).where(eq(itemTable.id, id));
}
