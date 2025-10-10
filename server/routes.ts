import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseExpenseFromText, parseMultiExpenseFromText } from "./openai";
import { getExchangeRates, convertCurrency } from "./currency";
import { setupAuth, isAuthenticated, encryptApiKey, decryptApiKey } from "./auth";
import { seedCategories } from "./seed";
import { generatePredictions, analyzeSpendingPatterns, generateSavingsRecommendations } from "./ai-insights";
import { insertCategorySchema, insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertGoalSchema } from "@shared/schema";
import { processReceiptImage } from "./ocr";
import multer from "multer";

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

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

  // Bulk import for CSV uploads (protected - user-specific)
  app.post("/api/transactions/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { transactions } = req.body;
      
      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: "Transactions must be an array" });
      }

      // Get user's accounts or create default
      let accounts = await storage.getAccounts(userId);
      let defaultAccount = accounts[0];
      
      if (!defaultAccount) {
        // Create default account for imports
        defaultAccount = await storage.createAccount({
          name: "Imported Transactions",
          type: "card",
          balance: 0,
          currency: "INR"
        }, userId);
      }

      // Validate and create transactions
      const createdTransactions = [];
      const errors: { index: number; error: string }[] = [];
      
      for (let i = 0; i < transactions.length; i++) {
        try {
          const txn = transactions[i];
          const validated = insertTransactionSchema.parse({
            ...txn,
            accountId: defaultAccount.id,
            // Ensure categoryId is valid or undefined
            categoryId: txn.categoryId || undefined,
          });
          
          const created = await storage.createTransaction(validated, userId);
          createdTransactions.push(created);
        } catch (error: any) {
          errors.push({ 
            index: i, 
            error: error.message || "Invalid transaction data" 
          });
        }
      }

      res.json({ 
        success: true,
        imported: createdTransactions.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        transactions: createdTransactions
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to import transactions" });
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

  app.post("/api/budgets/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { budgets: budgetData } = req.body;

      if (!Array.isArray(budgetData)) {
        return res.status(400).json({ error: "budgets must be an array" });
      }

      const createdBudgets = [];
      const errors = [];

      for (const [index, budgetItem] of budgetData.entries()) {
        try {
          const validated = insertBudgetSchema.parse(budgetItem);
          const budget = await storage.createBudget(validated, userId);
          createdBudgets.push(budget);
        } catch (error: any) {
          errors.push({
            row: index + 1,
            error: error.message || "Validation failed",
            data: budgetItem,
          });
        }
      }

      res.json({ 
        success: true,
        imported: createdBudgets.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        budgets: createdBudgets
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to import budgets" });
    }
  });

  app.get("/api/budgets/spending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      // Parse and validate dates if provided
      let start: Date | undefined;
      let end: Date | undefined;
      
      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }
      
      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
      }
      
      const budgets = await storage.getBudgets(userId);
      const spending: Record<string, number> = {};
      
      for (const budget of budgets) {
        spending[budget.categoryId] = await storage.getCategorySpending(budget.categoryId, userId, start, end);
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
      const { startDate, endDate } = req.query;
      
      // Parse and validate dates if provided
      let start: Date | undefined;
      let end: Date | undefined;
      
      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ error: "Invalid startDate format" });
        }
      }
      
      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: "Invalid endDate format" });
        }
        // Normalize to end of day
        end.setHours(23, 59, 59, 999);
      }
      
      // Guard against start > end
      if (start && end && start > end) {
        return res.status(400).json({ error: "startDate must be before or equal to endDate" });
      }
      
      const stats = await storage.getDashboardStats(userId, start, end);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // AI Insights (protected - user-specific)
  app.get("/api/insights/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Get all user transactions for analysis
      const transactions = await storage.getTransactions(userId);
      
      if (transactions.length === 0) {
        return res.json([]);
      }

      // Decrypt API key if available
      const openaiApiKey = user.openaiApiKey ? decryptApiKey(user.openaiApiKey) : '';
      const aiModel = user.aiModel || 'gpt-4o';

      const predictions = await generatePredictions(transactions, openaiApiKey, aiModel);
      res.json(predictions);
    } catch (error) {
      console.error("Predictions error:", error);
      res.status(500).json({ error: "Failed to generate predictions" });
    }
  });

  app.get("/api/insights/patterns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const transactions = await storage.getTransactions(userId);
      const categories = await storage.getCategories(userId);
      
      if (transactions.length === 0) {
        return res.json([]);
      }

      const openaiApiKey = user.openaiApiKey ? decryptApiKey(user.openaiApiKey) : '';
      const aiModel = user.aiModel || 'gpt-4o';

      const patterns = await analyzeSpendingPatterns(transactions, openaiApiKey, aiModel);
      
      // Enrich patterns with category names
      const enrichedPatterns = patterns.map(pattern => {
        const category = categories.find(c => c.id === pattern.category);
        return {
          ...pattern,
          categoryName: category?.name || pattern.category,
        };
      });

      res.json(enrichedPatterns);
    } catch (error) {
      console.error("Patterns error:", error);
      res.status(500).json({ error: "Failed to analyze spending patterns" });
    }
  });

  app.get("/api/insights/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const transactions = await storage.getTransactions(userId);
      
      if (transactions.length === 0) {
        return res.json([]);
      }

      // Calculate current savings rate
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

      const openaiApiKey = user.openaiApiKey ? decryptApiKey(user.openaiApiKey) : '';
      const aiModel = user.aiModel || 'gpt-4o';

      const recommendations = await generateSavingsRecommendations(
        transactions,
        savingsRate,
        openaiApiKey,
        aiModel
      );

      res.json(recommendations);
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
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

  // OCR - Receipt/Bill scanning (protected - user-specific)
  app.post("/api/ocr/scan", isAuthenticated, upload.single('receipt'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get user's OpenAI API key and model preference
      const user = await storage.getUser(userId);
      
      if (!user?.openaiApiKey) {
        return res.status(400).json({ 
          error: "OpenAI API key required for OCR scanning. Please add your key in Settings." 
        });
      }

      // Determine file type and use appropriate extraction method
      const { extractDataWithVision, extractDataFromPDF } = await import("./ocr");
      let ocrResult;

      if (file.mimetype === 'application/pdf') {
        // Handle PDF files
        ocrResult = await extractDataFromPDF(
          file.buffer, 
          user.openaiApiKey,
          user.aiModel || 'gpt-4o-mini'
        );
      } else if (file.mimetype.startsWith('image/')) {
        // Handle image files (jpg, png, etc.)
        ocrResult = await extractDataWithVision(
          file.buffer, 
          user.openaiApiKey,
          user.aiModel || 'gpt-4o-mini'
        );
      } else {
        return res.status(400).json({ 
          error: "Unsupported file type. Please upload an image (JPG, PNG) or PDF file." 
        });
      }
      
      // Parse the extracted data into transaction format
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

      // Prepare transaction data from OCR result
      const transaction: any = {
        amount: ocrResult.total || 0,
        type: 'expense',
        category: 'Other',
        categoryId: categories.find(c => c.name === 'Other')?.id || '',
        accountId: accounts[0].id,
        description: ocrResult.merchant || 'Receipt scan',
        date: ocrResult.date ? new Date(ocrResult.date).toISOString() : new Date().toISOString(),
        notes: `Scanned from receipt${ocrResult.items ? `\n\nItems:\n${ocrResult.items.map(item => `- ${item.description}: ₹${item.amount}`).join('\n')}` : ''}`,
      };

      // Try to auto-categorize based on merchant name or items
      if (ocrResult.merchant) {
        const merchantLower = ocrResult.merchant.toLowerCase();
        const matchedCategory = categories.find(c => 
          merchantLower.includes(c.name.toLowerCase()) && c.type === 'expense'
        );
        if (matchedCategory) {
          transaction.category = matchedCategory.name;
          transaction.categoryId = matchedCategory.id;
        }
      }

      res.json({ 
        transaction,
        ocrResult: {
          merchant: ocrResult.merchant,
          date: ocrResult.date,
          total: ocrResult.total,
          items: ocrResult.items,
          confidence: ocrResult.total ? 'high' : 'low',
        },
      });
    } catch (error: any) {
      console.error('OCR scan error:', error);
      res.status(500).json({ error: error.message || "Failed to scan receipt" });
    }
  });

  // Analytics - Monthly Income vs Expense Trends (protected - user-specific)
  app.get("/api/analytics/trends", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const transactions = await storage.getTransactions(userId);

      if (transactions.length === 0) {
        return res.json([]);
      }

      // Parse dates if provided (selected month)
      let selectedDate: Date | undefined;
      if (startDate && endDate) {
        selectedDate = new Date(startDate as string);
      }

      // Group transactions by month
      const monthlyData = new Map<string, { income: number; expenses: number }>();

      transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { income: 0, expenses: 0 });
        }

        const data = monthlyData.get(monthKey)!;
        const amount = Number(t.amount);
        
        if (t.type === 'income') {
          data.income += amount;
        } else {
          data.expenses += amount;
        }
      });

      // Get 12 months ending with selected month (or current month if not specified)
      const result = [];
      const endMonth = selectedDate || new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(endMonth.getFullYear(), endMonth.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const data = monthlyData.get(monthKey) || { income: 0, expenses: 0 };
        
        result.push({
          month: monthKey,
          income: data.income,
          expenses: data.expenses,
          savings: data.income - data.expenses,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Trends error:", error);
      res.status(500).json({ error: "Failed to fetch trends" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
