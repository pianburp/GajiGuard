"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { rateLimit } from "@/lib/infra/rate-limit";
import * as userService from "@/lib/services/user.service";

export async function getBudget(): Promise<number | null> {
  const session = await requireAuth();
  rateLimit(`${session.id}:getBudget`);
  return userService.getBudget(session.id);
}

export async function getGajiDay(): Promise<number> {
  const session = await requireAuth();
  rateLimit(`${session.id}:getGajiDay`);
  return userService.getGajiDay(session.id);
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
  await userService.setBudget(session.id, value);
}

export async function setGajiDay(day: number): Promise<void> {
  const session = await requireAuth();
  rateLimit(`${session.id}:setGajiDay`, 10);
  const value = gajiDaySchema.parse(day);
  await userService.setGajiDay(session.id, value);
}
