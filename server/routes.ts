import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseExpenseFromText } from "./openai";
import { getExchangeRates, convertCurrency } from "./currency";
import { setupAuth, isAuthenticated } from "./auth";
import { seedCategories } from "./seed";
import { insertCategorySchema, insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertGoalSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  await setupAuth(app);
  
  // Seed default categories if needed
  await seedCategories();

  // Auth routes (handled in auth.ts: /api/register, /api/login, /api/logout, /api/user)

  // User preferences
  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { aiModel, openaiApiKey } = req.body;
      
      if (aiModel) {
        const updatedUser = await storage.updateUserAiModel(userId, aiModel);
        return res.json(updatedUser);
      }
      
      if (openaiApiKey !== undefined) {
        const updatedUser = await storage.updateUserOpenAIKey(userId, openaiApiKey);
        const { password: _, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      }
      
      res.status(400).json({ error: "AI model or OpenAI API key is required" });
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Categories (public - not user-specific)
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

  // Accounts (protected - user-specific)
  app.get("/api/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const accounts = await storage.getAccounts(userId);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(validated, userId);
      res.json(account);
    } catch (error) {
      res.status(400).json({ error: "Invalid account data" });
    }
  });

  // Transactions (protected - user-specific)
  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const transactions = await storage.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validated, userId);
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  // Budgets (protected - user-specific)
  app.get("/api/budgets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const budgets = await storage.getBudgets(userId);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertBudgetSchema.parse(req.body);
      const budget = await storage.createBudget(validated, userId);
      res.json(budget);
    } catch (error) {
      res.status(400).json({ error: "Invalid budget data" });
    }
  });

  app.get("/api/budgets/spending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const budgets = await storage.getBudgets(userId);
      const spending: Record<string, number> = {};
      
      for (const budget of budgets) {
        spending[budget.categoryId] = await storage.getCategorySpending(budget.categoryId, userId);
      }
      
      res.json(spending);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate spending" });
    }
  });

  // Goals (protected - user-specific)
  app.get("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const goals = await storage.getGoals(userId);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(validated, userId);
      res.json(goal);
    } catch (error) {
      res.status(400).json({ error: "Invalid goal data" });
    }
  });

  // Dashboard stats (protected - user-specific)
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Exchange rates (public)
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

  // Chat - AI expense parsing (protected - user-specific)
  app.post("/api/chat/parse", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      // Get user's AI model preference
      const user = await storage.getUser(userId);
      const aiModel = user?.aiModel || "gpt-4.1-mini";

      // Parse expense using OpenAI with user's preferred model
      const parsed = await parseExpenseFromText(text, aiModel);
      
      // Find matching category
      const categories = await storage.getCategories();
      const category = categories.find(c => 
        c.name.toLowerCase() === parsed.category.toLowerCase() && c.type === parsed.type
      );
      
      // Get first available account or create a default one
      let accounts = await storage.getAccounts(userId);
      if (accounts.length === 0) {
        const defaultAccount = await storage.createAccount({
          name: 'Main Wallet',
          type: 'wallet',
          balance: 0,
          currency: 'INR',
          icon: 'Wallet',
        }, userId);
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
