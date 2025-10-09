import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseExpenseFromText } from "./openai";
import { getExchangeRates, convertCurrency } from "./currency";
import { insertCategorySchema, insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertGoalSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validated = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validated);
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  // Accounts
  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const validated = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(validated);
      res.json(account);
    } catch (error) {
      res.status(400).json({ error: "Invalid account data" });
    }
  });

  // Transactions
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validated = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validated);
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  // Budgets
  app.get("/api/budgets", async (req, res) => {
    try {
      const budgets = await storage.getBudgets();
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      const validated = insertBudgetSchema.parse(req.body);
      const budget = await storage.createBudget(validated);
      res.json(budget);
    } catch (error) {
      res.status(400).json({ error: "Invalid budget data" });
    }
  });

  app.get("/api/budgets/spending", async (req, res) => {
    try {
      const budgets = await storage.getBudgets();
      const spending: Record<string, number> = {};
      
      for (const budget of budgets) {
        spending[budget.categoryId] = await storage.getCategorySpending(budget.categoryId);
      }
      
      res.json(spending);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate spending" });
    }
  });

  // Goals
  app.get("/api/goals", async (req, res) => {
    try {
      const goals = await storage.getGoals();
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const validated = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(validated);
      res.json(goal);
    } catch (error) {
      res.status(400).json({ error: "Invalid goal data" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Exchange rates
  app.get("/api/exchange-rates/:base?", async (req, res) => {
    try {
      const base = req.params.base || 'INR';
      const rates = await getExchangeRates(base);
      res.json(rates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  app.post("/api/convert-currency", async (req, res) => {
    try {
      const { amount, from, to } = req.body;
      const converted = await convertCurrency(amount, from, to);
      res.json({ amount: converted, from, to });
    } catch (error) {
      res.status(500).json({ error: "Failed to convert currency" });
    }
  });

  // Chat - AI expense parsing
  app.post("/api/chat/parse", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      // Parse expense using OpenAI
      const parsed = await parseExpenseFromText(text);
      
      // Find matching category
      const categories = await storage.getCategories();
      const category = categories.find(c => 
        c.name.toLowerCase() === parsed.category.toLowerCase() && c.type === parsed.type
      );
      
      // Get first available account or create a default one
      let accounts = await storage.getAccounts();
      if (accounts.length === 0) {
        const defaultAccount = await storage.createAccount({
          name: 'Main Wallet',
          type: 'wallet',
          balance: '0',
          currency: 'INR',
          icon: 'Wallet',
        });
        accounts = [defaultAccount];
      }

      const transaction = {
        amount: parsed.amount,
        type: parsed.type,
        category: category?.name || parsed.category,
        categoryId: category?.id || categories.find(c => c.name === 'Other')?.id || '',
        accountId: accounts[0].id,
        description: parsed.description,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        notes: parsed.notes,
      };

      res.json({ transaction });
    } catch (error: any) {
      console.error('Parse error:', error);
      res.status(500).json({ error: error.message || "Failed to parse expense" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
