"use server";

import { z } from "zod";
import {
  searchBnplSubscriptions,
  searchRecognizedSubscriptions,
  suggestCategoryForItem,
} from "@/lib/domain/brandfetch";
import { requireAuth } from "@/lib/auth/session";
import { rateLimit } from "@/lib/infra/rate-limit";
import type { Category, ItemType } from "@/lib/domain/types";

const querySchema = z
  .string()
  .trim()
  .min(1, "Query is required")
  .max(100, "Query is too long");

const typeSchema = z.enum(["subscription", "bnpl"]);

export async function searchSubscriptions(query: string, type: ItemType) {
  const session = await requireAuth();
  rateLimit(`${session.id}:searchSubscriptions`, 60);
  const parsedQuery = querySchema.parse(query);
  const parsedType = typeSchema.parse(type);

  if (parsedType === "bnpl") {
    return searchBnplSubscriptions(parsedQuery, 4);
  }

  return searchRecognizedSubscriptions(parsedQuery, 6);
}

export async function suggestCategory(
  name: string,
  type: ItemType,
): Promise<Category> {
  const session = await requireAuth();
  rateLimit(`${session.id}:suggestCategory`, 60);
  const parsedName = z.string().trim().max(255).parse(name);
  const parsedType = typeSchema.parse(type);
  return suggestCategoryForItem(parsedName, parsedType);
}

