export type ItemType = "subscription" | "bnpl";
export type BillingCycle = "weekly" | "biweekly" | "monthly" | "yearly";
export type Category =
  | "entertainment"
  | "food"
  | "transport"
  | "shopping"
  | "gadget"
  | "insurance"
  | "education"
  | "health"
  | "utilities"
  | "other";

export type OccurrenceStatus = "upcoming" | "paid" | "missed";

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  brandIconUrl: string | null;
  amount: number;
  currency: "MYR";
  billingCycle: BillingCycle;
  billingDay: number;
  startDate: string;
  category: Category;
  color: string;
  notes: string;
  isActive: boolean;
  isShariah: boolean;
  interestRate: number;
  totalInstallments: number | null;
  installmentsPaid: number;
  paidDates: string[];
}

export interface Occurrence {
  itemId: string;
  date: string;
  amount: number;
  status: OccurrenceStatus;
}
