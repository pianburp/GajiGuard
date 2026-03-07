"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { rateLimit } from "@/lib/infra/rate-limit";
import { getDashboardDataForUser } from "@/lib/services/dashboard.service";
import type { DashboardData } from "@/lib/domain/dashboard";

const yearSchema = z
  .number()
  .int("Year must be a whole number")
  .min(2000, "Year must be 2000 or later")
  .max(2100, "Year must be 2100 or earlier");

const monthSchema = z
  .number()
  .int("Month must be a whole number")
  .min(0, "Month must be between 0 and 11")
  .max(11, "Month must be between 0 and 11");

export async function getDashboardData(
  year: number,
  month: number,
): Promise<DashboardData> {
  const session = await requireAuth();
  rateLimit(`${session.id}:getDashboardData`);
  const parsedYear = yearSchema.parse(year);
  const parsedMonth = monthSchema.parse(month);
  return getDashboardDataForUser(session.id, parsedYear, parsedMonth);
}

