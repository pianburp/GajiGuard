import type { BillingCycle, Category } from "@/lib/domain/types";

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "entertainment", label: "Entertainment" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "shopping", label: "Shopping" },
  { value: "gadget", label: "Gadget" },
  { value: "insurance", label: "Insurance" },
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
];

export const ITEM_COLORS = [
  "#0F766E",
  "#0369A1",
  "#B45309",
  "#BE123C",
  "#4C1D95",
  "#15803D",
];

/** Donut / badge colours keyed by category. */
export const CATEGORY_COLORS: Record<Category, string> = {
  entertainment: "#8B5CF6", // violet
  food: "#F59E0B",          // amber
  transport: "#3B82F6",     // blue
  shopping: "#EC4899",      // pink
  gadget: "#6366F1",        // indigo
  insurance: "#14B8A6",     // teal
  education: "#F97316",     // orange
  health: "#EF4444",        // red
  utilities: "#22C55E",     // green
  other: "#94A3B8",         // slate
};

/** Multiply an item's per-cycle amount to get the yearly cost. */
export const BILLING_CYCLE_YEARLY_MULTIPLIER: Record<BillingCycle, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  yearly: 1,
};

