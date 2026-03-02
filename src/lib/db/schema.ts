import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  json,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────
// Better Auth tables (user, session, account, verification)
// ──────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ──────────────────────────────────────────────
// LangganCheck domain tables
// ──────────────────────────────────────────────

export const item = pgTable("item", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["subscription", "bnpl"] }).notNull(),
  name: text("name").notNull(),
  brandIconUrl: text("brand_icon_url"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("MYR"),
  billingCycle: text("billing_cycle", {
    enum: ["weekly", "biweekly", "monthly", "yearly"],
  }).notNull(),
  billingDay: integer("billing_day").notNull(),
  startDate: text("start_date").notNull(),
  category: text("category", {
    enum: [
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
    ],
  }).notNull(),
  color: text("color").notNull(),
  notes: text("notes").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  isShariah: boolean("is_shariah").notNull().default(false),
  interestRate: real("interest_rate").notNull().default(0),
  totalInstallments: integer("total_installments"),
  installmentsPaid: integer("installments_paid").notNull().default(0),
  paidDates: json("paid_dates").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
