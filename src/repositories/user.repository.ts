import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export interface UserSettings {
  monthlyBudget: number | null;
  gajiDay: number;
}

/** Find a user by id (single row) for ownership-safe reads. */
export async function findById(userId: string) {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  return rows[0] ?? null;
}

/** Read budget and gaji settings with sensible defaults applied. */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const rows = await db
    .select({
      monthlyBudget: user.monthlyBudget,
      gajiDay: user.gajiDay,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return {
    monthlyBudget: rows[0]?.monthlyBudget ?? null,
    gajiDay: rows[0]?.gajiDay ?? 25,
  };
}

export async function updateBudget(userId: string, amount: number | null): Promise<void> {
  await db
    .update(user)
    .set({ monthlyBudget: amount, updatedAt: new Date() })
    .where(eq(user.id, userId));
}

export async function updateGajiDay(userId: string, day: number): Promise<void> {
  await db
    .update(user)
    .set({ gajiDay: day, updatedAt: new Date() })
    .where(eq(user.id, userId));
}
