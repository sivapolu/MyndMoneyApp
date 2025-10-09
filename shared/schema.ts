import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Categories for expense/income classification
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'expense' or 'income'
  icon: text("icon").notNull(), // lucide icon name
  color: text("color").notNull(), // chart color reference
});

// Accounts (cash, card, wallet, crypto)
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'cash', 'card', 'wallet', 'crypto'
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default('0'),
  currency: text("currency").notNull().default('INR'),
  icon: text("icon").notNull(),
});

// Transactions (expenses and income)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'expense' or 'income'
  categoryId: varchar("category_id").references(() => categories.id).notNull(),
  accountId: varchar("account_id").references(() => accounts.id).notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull().default(sql`CURRENT_TIMESTAMP`),
  currency: text("currency").notNull().default('INR'),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringFrequency: text("recurring_frequency"), // 'daily', 'weekly', 'monthly', 'yearly'
  notes: text("notes"),
  parsedFrom: text("parsed_from"), // original chat input
});

// Budgets
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => categories.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  period: text("period").notNull().default('monthly'), // 'weekly', 'monthly', 'yearly'
  startDate: timestamp("start_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  alertAt50: boolean("alert_at_50").notNull().default(true),
  alertAt80: boolean("alert_at_80").notNull().default(true),
  alertAt100: boolean("alert_at_100").notNull().default(true),
});

// Savings Goals
export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).notNull().default('0'),
  deadline: timestamp("deadline"),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

// Insert schemas with proper coercion
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true }).extend({
  balance: z.coerce.number(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true }).extend({
  amount: z.coerce.number(),
  date: z.coerce.date().optional(),
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true }).extend({
  amount: z.coerce.number(),
  startDate: z.coerce.date().optional(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({ id: true }).extend({
  targetAmount: z.coerce.number(),
  currentAmount: z.coerce.number(),
  deadline: z.coerce.date().optional().nullable(),
});

// Types
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

// Chat message type for expense entry
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  transactionPreview?: {
    amount: number;
    type: 'expense' | 'income';
    category: string;
    description: string;
    date: Date;
  };
}

// Dashboard stats type
export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  topCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  recentTransactions: Transaction[];
}

// AI parsing result type
export interface ParsedExpense {
  amount: number;
  type: 'expense' | 'income';
  category: string;
  description: string;
  date?: Date;
  notes?: string;
}
