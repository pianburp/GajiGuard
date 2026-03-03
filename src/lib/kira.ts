import { RECOGNIZED_SUBSCRIPTIONS, getBrandfetchIconUrl } from "@/lib/brandfetch";
import { BILLING_CYCLE_YEARLY_MULTIPLIER } from "@/lib/constants";
import type { BillingCycle } from "@/lib/domain/types";

/**
 * Pre-built catalogue of popular Malaysian subscriptions with typical MYR pricing.
 * Used by the /kira quick-calculator so users can tap-to-add without typing.
 */

export interface KiraItem {
  /** Unique slug used in URL query params */
  slug: string;
  name: string;
  domain: string;
  iconUrl: string;
  /** Default monthly-equivalent price in MYR */
  defaultAmount: number;
  /** Native billing cycle (affects yearly multiplier) */
  billingCycle: BillingCycle;
  group: "streaming" | "music" | "cloud" | "ai" | "productivity" | "bnpl" | "telco" | "other";
}

export const KIRA_CATALOGUE: KiraItem[] = ([
  // Streaming
  { slug: "netflix", name: "Netflix", domain: "netflix.com", defaultAmount: 55, billingCycle: "monthly" as const, group: "streaming" as const },
  { slug: "disneyplus", name: "Disney+", domain: "disneyplus.com", defaultAmount: 54.90, billingCycle: "monthly" as const, group: "streaming" as const },
  { slug: "viu", name: "Viu", domain: "viu.com", defaultAmount: 14.99, billingCycle: "monthly" as const, group: "streaming" as const },
  { slug: "primevideo", name: "Prime Video", domain: "primevideo.com", defaultAmount: 14.90, billingCycle: "monthly" as const, group: "streaming" as const },
  { slug: "astro", name: "Astro", domain: "astroawani.com", defaultAmount: 79, billingCycle: "monthly" as const, group: "streaming" as const },
  { slug: "unifitv", name: "Unifi TV", domain: "unifi.com.my", defaultAmount: 30, billingCycle: "monthly" as const, group: "streaming" as const },

  // Music
  { slug: "spotify", name: "Spotify", domain: "spotify.com", defaultAmount: 15.90, billingCycle: "monthly" as const, group: "music" as const },
  { slug: "applemusic", name: "Apple Music", domain: "apple.com", defaultAmount: 16.90, billingCycle: "monthly" as const, group: "music" as const },
  { slug: "ytmusic", name: "YouTube Music", domain: "youtube.com", defaultAmount: 22.99, billingCycle: "monthly" as const, group: "music" as const },
  { slug: "joox", name: "JOOX", domain: "joox.com", defaultAmount: 14.90, billingCycle: "monthly" as const, group: "music" as const },

  // Cloud
  { slug: "icloud", name: "iCloud+", domain: "icloud.com", defaultAmount: 4.90, billingCycle: "monthly" as const, group: "cloud" as const },
  { slug: "googleone", name: "Google One", domain: "google.com", defaultAmount: 8.99, billingCycle: "monthly" as const, group: "cloud" as const },

  // AI
  { slug: "chatgpt", name: "ChatGPT Plus", domain: "chatgpt.com", defaultAmount: 98, billingCycle: "monthly" as const, group: "ai" as const },
  { slug: "gemini", name: "Gemini Advanced", domain: "google.com", defaultAmount: 93, billingCycle: "monthly" as const, group: "ai" as const },
  { slug: "claude", name: "Claude Pro", domain: "claude.ai", defaultAmount: 93, billingCycle: "monthly" as const, group: "ai" as const },

  // Productivity
  { slug: "canva", name: "Canva Pro", domain: "canva.com", defaultAmount: 54.99, billingCycle: "monthly" as const, group: "productivity" as const },
  { slug: "notion", name: "Notion", domain: "notion.so", defaultAmount: 48, billingCycle: "monthly" as const, group: "productivity" as const },
  { slug: "ms365", name: "Microsoft 365", domain: "microsoft.com", defaultAmount: 30, billingCycle: "monthly" as const, group: "productivity" as const },
  { slug: "adobe", name: "Adobe Creative Cloud", domain: "adobe.com", defaultAmount: 228, billingCycle: "monthly" as const, group: "productivity" as const },

  // Telco
  { slug: "maxis", name: "Maxis", domain: "maxis.com.my", defaultAmount: 58, billingCycle: "monthly" as const, group: "telco" as const },
  { slug: "celcomdigi", name: "CelcomDigi", domain: "celcomdigi.com", defaultAmount: 55, billingCycle: "monthly" as const, group: "telco" as const },
  { slug: "umobile", name: "U Mobile", domain: "u.com.my", defaultAmount: 39, billingCycle: "monthly" as const, group: "telco" as const },
  { slug: "time", name: "TIME", domain: "time.com.my", defaultAmount: 99, billingCycle: "monthly" as const, group: "telco" as const },
] as const).map((item) => ({
  ...item,
  iconUrl: getBrandfetchIconUrl(item.domain),
}));

export const KIRA_GROUPS: { key: KiraItem["group"]; label: string }[] = [
  { key: "streaming", label: "Streaming" },
  { key: "music", label: "Music" },
  { key: "cloud", label: "Cloud" },
  { key: "ai", label: "AI" },
  { key: "productivity", label: "Productivity" },
  { key: "telco", label: "Telco" },
];

/** Compute yearly cost for a kira item */
export function kiraYearlyCost(amount: number, cycle: BillingCycle): number {
  return amount * BILLING_CYCLE_YEARLY_MULTIPLIER[cycle];
}

/** Encode selected slugs + custom amounts into URL search params */
export function encodeKiraParams(
  selected: Map<string, number>,
): string {
  const parts: string[] = [];
  for (const [slug, amount] of selected.entries()) {
    const catalogueItem = KIRA_CATALOGUE.find((i) => i.slug === slug);
    if (catalogueItem && amount === catalogueItem.defaultAmount) {
      parts.push(slug);
    } else {
      parts.push(`${slug}:${amount}`);
    }
  }
  return parts.join(",");
}

/** Decode URL search params back into a selection map */
export function decodeKiraParams(
  param: string | null,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!param) return map;
  const parts = param.split(",").filter(Boolean);
  for (const part of parts) {
    const [slug, amountStr] = part.split(":");
    const catalogueItem = KIRA_CATALOGUE.find((i) => i.slug === slug);
    if (!catalogueItem) continue;
    const amount = amountStr ? parseFloat(amountStr) : catalogueItem.defaultAmount;
    if (!isNaN(amount) && amount > 0) {
      map.set(slug, amount);
    }
  }
  return map;
}
