"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { rateLimit } from "@/lib/infra/rate-limit";
import * as itemService from "@/lib/services/item.service";
import { suggestCategoryForItem } from "@/domain/brandfetch";
import { toLocalDateKey } from "@/lib/utils/date";
import type { Item } from "@/domain/types";

// ── Validation schemas ───────────────────────────────────────────

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Expected date in YYYY-MM-DD format",
});

const startDateString = dateString.refine(
  (value) => value <= toLocalDateKey(new Date()),
  {
    message: "Start date cannot be in the future",
  },
);

const itemSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(["subscription", "bnpl"]),
    name: z.string().min(1).max(255),
    brandIconUrl: z
      .string()
      .url()
      .refine((u) => u.startsWith("https://"), {
        message: "Only HTTPS URLs are allowed",
      })
      .nullable(),
    amount: z.number().positive().finite(),
    currency: z.literal("MYR"),
    billingCycle: z.enum(["weekly", "biweekly", "monthly", "yearly"]),
    billingDay: z.number().int().min(1).max(31),
    startDate: startDateString,
    category: z.enum([
      "entertainment",
      "food",
      "transport",
      "shopping",
      "gadget",
      "insurance",
      "education",
      "health",
      "utilities",
      "other",
    ]),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, {
      message: "Expected hex colour (#RRGGBB)",
    }),
    notes: z.string().max(1000).default(""),
    isActive: z.boolean(),
    isShariah: z.boolean().default(false),
    interestRate: z.number().min(0).max(100).default(0),
    totalInstallments: z.number().int().positive().nullable(),
    installmentsPaid: z.number().int().min(0),
    paidDates: z.array(dateString),
  })
  .superRefine((data, ctx) => {
    if (data.billingDay < 1 || data.billingDay > 31) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["billingDay"],
        message: "Billing day must be between 1 and 31",
      });
    }

    if (data.type !== "bnpl") return;

    if (data.totalInstallments === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalInstallments"],
        message: "Total installments is required for BNPL items",
      });
      return;
    }

    if (data.installmentsPaid > data.totalInstallments) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installmentsPaid"],
        message: "Installments paid cannot exceed total installments",
      });
    }

    if (data.isShariah && data.interestRate > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interestRate"],
        message: "Shariah plans cannot have interest",
      });
    }
  });

const markPaidSchema = z.object({
  itemId: z.string().uuid(),
  date: dateString,
});

// ── Server actions ───────────────────────────────────────────────

export async function getItems(): Promise<Item[]> {
  const user = await requireAuth();
  rateLimit(`${user.id}:getItems`);
  return itemService.getItemsByUserId(user.id);
}

export async function upsertItem(raw: unknown): Promise<void> {
  const user = await requireAuth();
  rateLimit(`${user.id}:upsertItem`, 20);
  const data = itemSchema.parse(raw);
  const normalized: Item = {
    ...data,
    category: suggestCategoryForItem(data.name, data.type),
  };
  await itemService.upsertItem(user.id, normalized);
}

export async function markItemPaid(
  itemId: string,
  date: string,
): Promise<Item | null> {
  const user = await requireAuth();
  rateLimit(`${user.id}:markItemPaid`, 20);
  const input = markPaidSchema.parse({ itemId, date });
  return itemService.markItemPaid(input.itemId, input.date, user.id);
}

export async function deleteItem(itemId: string): Promise<boolean> {
  const user = await requireAuth();
  rateLimit(`${user.id}:deleteItem`, 10);
  const id = z.string().uuid().parse(itemId);
  return itemService.deleteItem(id, user.id);
}
