import { db } from "./db";
import { eq, and, gte, sql } from "drizzle-orm";
import type {
  Category, InsertCategory,
  Account, InsertAccount,
  Transaction, InsertTransaction,
  Budget, InsertBudget,
  Goal, InsertGoal,
  User, UpsertUser,
  DashboardStats
} from "@shared/schema";
import { categories, accounts, transactions, budgets, goals, users } from "@shared/schema";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Categories (global, not user-specific)
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Accounts (user-specific)
  getAccounts(userId: string): Promise<Account[]>;
  getAccountById(id: string, userId: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount, userId: string): Promise<Account>;
  updateAccountBalance(id: string, userId: string, amount: number): Promise<Account>;
  
  // Transactions (user-specific)
  getTransactions(userId: string): Promise<Transaction[]>;
  getTransactionById(id: string, userId: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction, userId: string): Promise<Transaction>;
  getRecentTransactions(userId: string, limit: number): Promise<Transaction[]>;
  
  // Budgets (user-specific)
  getBudgets(userId: string): Promise<Budget[]>;
  getBudgetById(id: string, userId: string): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget, userId: string): Promise<Budget>;
  getCategorySpending(categoryId: string, userId: string): Promise<number>;
  
  // Goals (user-specific)
  getGoals(userId: string): Promise<Goal[]>;
  getGoalById(id: string, userId: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal, userId: string): Promise<Goal>;
  updateGoalProgress(id: string, userId: string, amount: number): Promise<Goal>;
  
  // Dashboard (user-specific)
  getDashboardStats(userId: string): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Categories (global, not user-specific)
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  // Accounts (user-specific)
  async getAccounts(userId: string): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async getAccountById(id: string, userId: string): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return account;
  }

  async createAccount(insertAccount: InsertAccount, userId: string): Promise<Account> {
    const [account] = await db
      .insert(accounts)
      .values({
        ...insertAccount,
        userId,
        balance: String(insertAccount.balance),
      })
      .returning();
    return account;
  }

  async updateAccountBalance(id: string, userId: string, amount: number): Promise<Account> {
    const account = await this.getAccountById(id, userId);
    if (!account) {
      throw new Error('Account not found');
    }
    const newBalance = String(Number(account.balance) + amount);
    const [updated] = await db
      .update(accounts)
      .set({ balance: newBalance })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return updated;
  }

  // Transactions (user-specific)
  async getTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.date} DESC`);
  }

  async getTransactionById(id: string, userId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return transaction;
  }

  async createTransaction(insertTransaction: InsertTransaction, userId: string): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values({
        ...insertTransaction,
        userId,
        amount: String(insertTransaction.amount),
        date: insertTransaction.date || new Date(),
      })
      .returning();
    
    // Update account balance
    const balanceChange = transaction.type === 'income' 
      ? Number(transaction.amount) 
      : -Number(transaction.amount);
    await this.updateAccountBalance(transaction.accountId, userId, balanceChange);
    
    return transaction;
  }

  async getRecentTransactions(userId: string, limit: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.date} DESC`)
      .limit(limit);
  }

  // Budgets (user-specific)
  async getBudgets(userId: string): Promise<Budget[]> {
    return await db.select().from(budgets).where(eq(budgets.userId, userId));
  }

  async getBudgetById(id: string, userId: string): Promise<Budget | undefined> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    return budget;
  }

  async createBudget(insertBudget: InsertBudget, userId: string): Promise<Budget> {
    const [budget] = await db
      .insert(budgets)
      .values({
        ...insertBudget,
        userId,
        amount: String(insertBudget.amount),
        startDate: insertBudget.startDate || new Date(),
      })
      .returning();
    return budget;
  }

  async getCategorySpending(categoryId: string, userId: string): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const results = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.categoryId, categoryId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, monthStart)
        )
      );
    
    return results.reduce((sum, t) => sum + Number(t.amount), 0);
  }

  // Goals (user-specific)
  async getGoals(userId: string): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.userId, userId));
  }

  async getGoalById(id: string, userId: string): Promise<Goal | undefined> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
    return goal;
  }

  async createGoal(insertGoal: InsertGoal, userId: string): Promise<Goal> {
    const [goal] = await db
      .insert(goals)
      .values({
        ...insertGoal,
        userId,
        targetAmount: String(insertGoal.targetAmount),
        currentAmount: String(insertGoal.currentAmount),
      })
      .returning();
    return goal;
  }

  async updateGoalProgress(id: string, userId: string, amount: number): Promise<Goal> {
    const goal = await this.getGoalById(id, userId);
    if (!goal) {
      throw new Error('Goal not found');
    }
    const newAmount = String(Number(goal.currentAmount) + amount);
    const [updated] = await db
      .update(goals)
      .set({ currentAmount: newAmount })
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    return updated;
  }

  // Dashboard (user-specific)
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, monthStart)
        )
      );
    
    const monthlyIncome = allTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const monthlyExpenses = allTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));
    
    const totalBalance = userAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
    
    // Top categories
    const categorySpending = new Map<string, number>();
    const categoryMap = new Map<string, string>();
    
    for (const t of allTransactions.filter(t => t.type === 'expense')) {
      const current = categorySpending.get(t.categoryId) || 0;
      categorySpending.set(t.categoryId, current + Number(t.amount));
      
      if (!categoryMap.has(t.categoryId)) {
        const cat = await this.getCategoryById(t.categoryId);
        if (cat) categoryMap.set(t.categoryId, cat.name);
      }
    }
    
    const topCategories = Array.from(categorySpending.entries())
      .map(([categoryId, amount]) => ({
        category: categoryMap.get(categoryId) || 'Unknown',
        amount,
        percentage: monthlyExpenses > 0 ? Math.round((amount / monthlyExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    const recentTransactions = await this.getRecentTransactions(userId, 5);
    
    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings: monthlyIncome - monthlyExpenses,
      topCategories,
      recentTransactions,
    };
  }
}

export const storage = new DatabaseStorage();
