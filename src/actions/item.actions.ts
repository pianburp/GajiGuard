"use server";

import { getSessionUser } from "@/lib/session";
import * as itemService from "@/lib/services/item.service";
import type { Item } from "@/lib/domain/types";

function requireUserId(userId: string | undefined): string {
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export async function getItems(): Promise<Item[]> {
  const user = await getSessionUser();
  if (!user) return [];
  return itemService.getItemsByUserId(user.id);
}

export async function upsertItem(data: Item): Promise<void> {
  const user = await getSessionUser();
  const userId = requireUserId(user?.id);
  await itemService.upsertItem(userId, data);
}

export async function markItemPaid(
  itemId: string,
  date: string,
): Promise<Item | null> {
  const user = await getSessionUser();
  const userId = requireUserId(user?.id);
  return itemService.markItemPaid(itemId, date, userId);
}


