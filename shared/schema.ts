import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (Required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(), // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  aiModel: varchar("ai_model").default("gpt-4.1-mini"), // User's preferred AI model for expense parsing
  openaiApiKey: varchar("openai_api_key"), // User's personal OpenAI API key (encrypted)
  resetToken: varchar("reset_token"), // Password reset token
  resetTokenExpiry: timestamp("reset_token_expiry"), // Token expiration time
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories for expense/income classification (Global and user-specific)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null = global category, value = user-specific
  name: text("name").notNull(),
  type: text("type").notNull(), // 'expense' or 'income'
  icon: text("icon").notNull(), // lucide icon name
  color: text("color").notNull(), // chart color reference
});

// Accounts (cash, card, wallet, crypto) - User-specific
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'cash', 'card', 'wallet', 'crypto'
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default('0'),
  currency: text("currency").notNull().default('INR'),
  icon: text("icon").notNull(),
});

// Transactions (expenses and income) - User-specific
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
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

// Budgets - User-specific
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  categoryId: varchar("category_id").references(() => categories.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  period: text("period").notNull().default('monthly'), // 'weekly', 'monthly', 'yearly'
  startDate: timestamp("start_date").notNull().default(sql`CURRENT_TIMESTAMP`),
  alertAt50: boolean("alert_at_50").notNull().default(true),
  alertAt80: boolean("alert_at_80").notNull().default(true),
  alertAt100: boolean("alert_at_100").notNull().default(true),
});

// Savings Goals - User-specific
export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).notNull().default('0'),
  deadline: timestamp("deadline"),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

// Insert schemas with proper coercion
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, userId: true });

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, userId: true }).extend({
  balance: z.coerce.number(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, userId: true }).extend({
  amount: z.coerce.number(),
  date: z.coerce.date().optional(),
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({ id: true, userId: true }).extend({
  amount: z.coerce.number(),
  startDate: z.coerce.date().optional(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, userId: true }).extend({
  targetAmount: z.coerce.number(),
  currentAmount: z.coerce.number(),
  deadline: z.coerce.date().optional().nullable(),
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

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
  transactionPreviews?: Array<{
    amount: number;
    type: 'expense' | 'income';
    category: string;
    categoryId: string;
    accountId: string;
    description: string;
    date: string;
    notes?: string;
  }>;
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
