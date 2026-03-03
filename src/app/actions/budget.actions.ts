"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export async function getBudget(): Promise<number | null> {
  const session = await requireAuth();
  rateLimit(`${session.id}:getBudget`);
  const rows = await db
    .select({ monthlyBudget: user.monthlyBudget })
    .from(user)
    .where(eq(user.id, session.id));
  return rows[0]?.monthlyBudget ?? null;
}

const budgetSchema = z
  .number()
  .positive("Budget must be positive")
  .finite()
  .max(999999, "Budget cannot exceed RM 999,999")
  .nullable();

export async function setBudget(amount: number | null): Promise<void> {
  const session = await requireAuth();
  rateLimit(`${session.id}:setBudget`, 10);
  const value = budgetSchema.parse(amount);
  await db
    .update(user)
    .set({ monthlyBudget: value })
    .where(eq(user.id, session.id));
}
