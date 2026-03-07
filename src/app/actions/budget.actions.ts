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

export async function getGajiDay(): Promise<number> {
  const session = await requireAuth();
  rateLimit(`${session.id}:getGajiDay`);
  const rows = await db
    .select({ gajiDay: user.gajiDay })
    .from(user)
    .where(eq(user.id, session.id));
  return rows[0]?.gajiDay ?? 25;
}

const budgetSchema = z
  .number()
  .positive("Budget must be positive")
  .finite()
  .max(999999, "Budget cannot exceed RM 999,999")
  .nullable();

const gajiDaySchema = z
  .number()
  .int("Gaji day must be a whole number")
  .min(1, "Gaji day must be between 1 and 31")
  .max(31, "Gaji day must be between 1 and 31");

export async function setBudget(amount: number | null): Promise<void> {
  const session = await requireAuth();
  rateLimit(`${session.id}:setBudget`, 10);
  const value = budgetSchema.parse(amount);
  await db
    .update(user)
    .set({ monthlyBudget: value })
    .where(eq(user.id, session.id));
}

export async function setGajiDay(day: number): Promise<void> {
  const session = await requireAuth();
  rateLimit(`${session.id}:setGajiDay`, 10);
  const value = gajiDaySchema.parse(day);
  await db
    .update(user)
    .set({ gajiDay: value })
    .where(eq(user.id, session.id));
}
