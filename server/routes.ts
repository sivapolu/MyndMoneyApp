import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseExpenseFromText, parseMultiExpenseFromText } from "./openai";
import { getExchangeRates, convertCurrency } from "./currency";
import { setupAuth, isAuthenticated, encryptApiKey } from "./auth";
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
        const encryptedKey = openaiApiKey ? encryptApiKey(openaiApiKey) : '';
        const updatedUser = await storage.updateUserOpenAIKey(userId, encryptedKey);
        const { password: _, ...userWithoutPassword } = updatedUser;
        return res.json(userWithoutPassword);
      }
      
      res.status(400).json({ error: "AI model or OpenAI API key is required" });
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Categories (global and user-specific)
  app.get("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const categories = await storage.getCategories(userId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validated, userId);
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

  // Batch transaction creation (protected - user-specific)
  app.post("/api/transactions/batch", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { transactions } = req.body;
      
      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: "Transactions must be an array" });
      }

      // VALIDATE ALL transactions first (all-or-nothing approach)
      const validatedTransactions = [];
      for (let i = 0; i < transactions.length; i++) {
        try {
          const validated = insertTransactionSchema.parse(transactions[i]);
          validatedTransactions.push(validated);
        } catch (error: any) {
          return res.status(400).json({ 
            error: `Invalid transaction at index ${i}: ${error.message || "Invalid data"}`,
            index: i
          });
        }
      }

      // All validations passed, now create all transactions
      const createdTransactions = [];
      for (const validated of validatedTransactions) {
        const transaction = await storage.createTransaction(validated, userId);
        createdTransactions.push(transaction);
      }

      res.json({ 
        success: true,
        count: createdTransactions.length,
        transactions: createdTransactions
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create transactions" });
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

  // Chat - AI multi-expense parsing (protected - user-specific)
  app.post("/api/chat/parse-multi", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { text, type } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      // Get user's AI model preference and API key
      const user = await storage.getUser(userId);
      const aiModel = user?.aiModel || "gpt-4.1-mini";
      const userOpenAIKey = user?.openaiApiKey || null;

      // Parse multiple expenses using OpenAI
      const { transactions: parsedTransactions, errors: parseErrors } = await parseMultiExpenseFromText(text, aiModel, userOpenAIKey, type);
      
      // If we have ANY errors, return 400 (atomic validation)
      if (parseErrors && parseErrors.length > 0) {
        return res.status(400).json({ 
          error: parsedTransactions.length === 0 
            ? "Failed to parse any valid transactions"
            : `Parsed ${parsedTransactions.length} transaction(s) but ${parseErrors.length} failed validation`,
          details: parseErrors,
          partialResults: parsedTransactions.length > 0 ? parsedTransactions.map(t => t.description) : undefined
        });
      }
      
      // Get categories and account once for all transactions
      const categories = await storage.getCategories(userId);
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

      // Process each parsed transaction
      const transactions = parsedTransactions.map(parsed => {
        // Find matching category
        const category = categories.find(c => 
          c.name.toLowerCase() === parsed.category.toLowerCase() && c.type === parsed.type
        ) || categories.find(c => 
          c.name.toLowerCase() === parsed.category.toLowerCase()
        );

        // Validate date
        let transactionDate = new Date();
        if (parsed.date) {
          const parsedDateObj = new Date(parsed.date);
          const now = new Date();
          const daysDiff = (now.getTime() - parsedDateObj.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff >= 0 && daysDiff <= 90) {
            transactionDate = parsedDateObj;
          }
        }

        return {
          amount: parsed.amount,
          type: parsed.type,
          category: category?.name || parsed.category,
          categoryId: category?.id || categories.find(c => c.name === 'Other')?.id || '',
          accountId: accounts[0].id,
          description: parsed.description,
          date: transactionDate.toISOString(),
          notes: parsed.notes,
        };
      });

      res.json({ transactions });
    } catch (error: any) {
      console.error('Multi-parse error:', error);
      res.status(500).json({ error: error.message || "Failed to parse expenses" });
    }
  });

  // Chat - AI expense parsing (protected - user-specific)
  app.post("/api/chat/parse", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { text, type } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      // Get user's AI model preference and API key
      const user = await storage.getUser(userId);
      const aiModel = user?.aiModel || "gpt-4.1-mini";
      const userOpenAIKey = user?.openaiApiKey || null;

      // Parse expense using OpenAI with user's preferred model and API key
      const parsed = await parseExpenseFromText(text, aiModel, userOpenAIKey, type);
      
      // Find matching category (prioritize matching type and name, fallback to name only)
      const categories = await storage.getCategories(userId);
      const category = categories.find(c => 
        c.name.toLowerCase() === parsed.category.toLowerCase() && c.type === parsed.type
      ) || categories.find(c => 
        c.name.toLowerCase() === parsed.category.toLowerCase()
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

      // Use parsed date if valid and recent, otherwise use today
      let transactionDate = new Date();
      if (parsed.date) {
        const parsedDateObj = new Date(parsed.date);
        const now = new Date();
        const daysDiff = (now.getTime() - parsedDateObj.getTime()) / (1000 * 60 * 60 * 24);
        // Only use parsed date if it's within last 90 days and not in the future
        if (daysDiff >= 0 && daysDiff <= 90) {
          transactionDate = parsedDateObj;
        }
      }

      const transaction = {
        amount: parsed.amount,
        type: parsed.type,
        category: category?.name || parsed.category,
        categoryId: category?.id || categories.find(c => c.name === 'Other')?.id || '',
        accountId: accounts[0].id,
        description: parsed.description,
        date: transactionDate.toISOString(),
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
