import { randomUUID } from "crypto";
import type {
  Category, InsertCategory,
  Account, InsertAccount,
  Transaction, InsertTransaction,
  Budget, InsertBudget,
  Goal, InsertGoal,
  DashboardStats
} from "@shared/schema";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Accounts
  getAccounts(): Promise<Account[]>;
  getAccountById(id: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccountBalance(id: string, amount: number): Promise<Account>;
  
  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getRecentTransactions(limit: number): Promise<Transaction[]>;
  
  // Budgets
  getBudgets(): Promise<Budget[]>;
  getBudgetById(id: string): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  getCategorySpending(categoryId: string): Promise<number>;
  
  // Goals
  getGoals(): Promise<Goal[]>;
  getGoalById(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoalProgress(id: string, amount: number): Promise<Goal>;
  
  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  private categories: Map<string, Category>;
  private accounts: Map<string, Account>;
  private transactions: Map<string, Transaction>;
  private budgets: Map<string, Budget>;
  private goals: Map<string, Goal>;

  constructor() {
    this.categories = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    this.budgets = new Map();
    this.goals = new Map();
    
    // Initialize default categories
    this.initializeDefaultCategories();
  }

  private async initializeDefaultCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: 'Food', type: 'expense', icon: 'UtensilsCrossed', color: 'chart-1' },
      { name: 'Transport', type: 'expense', icon: 'Car', color: 'chart-2' },
      { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: 'chart-3' },
      { name: 'Bills', type: 'expense', icon: 'Receipt', color: 'chart-4' },
      { name: 'Entertainment', type: 'expense', icon: 'Music', color: 'chart-5' },
      { name: 'Healthcare', type: 'expense', icon: 'Heart', color: 'chart-1' },
      { name: 'Education', type: 'expense', icon: 'GraduationCap', color: 'chart-2' },
      { name: 'Travel', type: 'expense', icon: 'Plane', color: 'chart-3' },
      { name: 'Other', type: 'expense', icon: 'MoreHorizontal', color: 'chart-4' },
      { name: 'Salary', type: 'income', icon: 'Briefcase', color: 'chart-3' },
      { name: 'Freelance', type: 'income', icon: 'Laptop', color: 'chart-2' },
      { name: 'Investment', type: 'income', icon: 'TrendingUp', color: 'chart-1' },
    ];

    for (const cat of defaultCategories) {
      await this.createCategory(cat);
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  // Accounts
  async getAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getAccountById(id: string): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = randomUUID();
    const account: Account = { 
      ...insertAccount, 
      id,
      balance: String(insertAccount.balance),
    };
    this.accounts.set(id, account);
    return account;
  }

  async updateAccountBalance(id: string, amount: number): Promise<Account> {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error('Account not found');
    }
    const updatedAccount = { ...account, balance: String(Number(account.balance) + amount) };
    this.accounts.set(id, updatedAccount);
    return updatedAccount;
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = { 
      ...insertTransaction, 
      id,
      amount: String(insertTransaction.amount),
      date: insertTransaction.date || new Date(),
    };
    this.transactions.set(id, transaction);
    
    // Update account balance
    const balanceChange = transaction.type === 'income' 
      ? Number(transaction.amount) 
      : -Number(transaction.amount);
    await this.updateAccountBalance(transaction.accountId, balanceChange);
    
    return transaction;
  }

  async getRecentTransactions(limit: number): Promise<Transaction[]> {
    const all = await this.getTransactions();
    return all.slice(0, limit);
  }

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    return Array.from(this.budgets.values());
  }

  async getBudgetById(id: string): Promise<Budget | undefined> {
    return this.budgets.get(id);
  }

  async createBudget(insertBudget: InsertBudget): Promise<Budget> {
    const id = randomUUID();
    const budget: Budget = { 
      ...insertBudget, 
      id,
      amount: String(insertBudget.amount),
      startDate: insertBudget.startDate || new Date(),
    };
    this.budgets.set(id, budget);
    return budget;
  }

  async getCategorySpending(categoryId: string): Promise<number> {
    const transactions = Array.from(this.transactions.values());
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return transactions
      .filter(t => 
        t.categoryId === categoryId && 
        t.type === 'expense' &&
        new Date(t.date) >= monthStart
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }

  // Goals
  async getGoals(): Promise<Goal[]> {
    return Array.from(this.goals.values());
  }

  async getGoalById(id: string): Promise<Goal | undefined> {
    return this.goals.get(id);
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const id = randomUUID();
    const goal: Goal = { 
      ...insertGoal, 
      id,
      targetAmount: String(insertGoal.targetAmount),
      currentAmount: String(insertGoal.currentAmount),
    };
    this.goals.set(id, goal);
    return goal;
  }

  async updateGoalProgress(id: string, amount: number): Promise<Goal> {
    const goal = this.goals.get(id);
    if (!goal) {
      throw new Error('Goal not found');
    }
    const updatedGoal = { ...goal, currentAmount: String(Number(goal.currentAmount) + amount) };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const transactions = Array.from(this.transactions.values());
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = transactions.filter(t => new Date(t.date) >= monthStart);
    
    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const monthlyExpenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalBalance = Array.from(this.accounts.values())
      .reduce((sum, a) => sum + Number(a.balance), 0);
    
    // Top categories
    const categorySpending = new Map<string, number>();
    for (const t of monthlyTransactions.filter(t => t.type === 'expense')) {
      const current = categorySpending.get(t.categoryId) || 0;
      categorySpending.set(t.categoryId, current + Number(t.amount));
    }
    
    const topCategories = Array.from(categorySpending.entries())
      .map(([categoryId, amount]) => {
        const category = this.categories.get(categoryId);
        return {
          category: category?.name || 'Unknown',
          amount,
          percentage: monthlyExpenses > 0 ? Math.round((amount / monthlyExpenses) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    const recentTransactions = await this.getRecentTransactions(5);
    
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

export const storage = new MemStorage();
