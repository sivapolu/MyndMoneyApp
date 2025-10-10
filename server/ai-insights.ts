import OpenAI from 'openai';
import type { Transaction } from '@shared/schema';

interface PredictionData {
  month: string;
  predictedIncome: number;
  predictedExpenses: number;
  confidence: 'high' | 'medium' | 'low';
}

interface SpendingPattern {
  category: string;
  averageMonthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  insight: string;
}

interface SavingsRecommendation {
  type: 'reduce_spending' | 'increase_income' | 'optimize_budget' | 'emergency_fund';
  title: string;
  description: string;
  potentialSavings: number;
  priority: 'high' | 'medium' | 'low';
}

interface AIInsights {
  predictions: PredictionData[];
  spendingPatterns: SpendingPattern[];
  savingsRecommendations: SavingsRecommendation[];
  summary: string;
}

export async function generatePredictions(
  transactions: Transaction[],
  openaiApiKey: string,
  aiModel: string = 'gpt-4o'
): Promise<PredictionData[]> {
  if (!openaiApiKey) {
    return generateFallbackPredictions(transactions);
  }

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Prepare transaction summary
    const monthlyData = aggregateMonthlyData(transactions);
    const summary = {
      monthlyAverages: monthlyData,
      totalMonths: monthlyData.length,
      trends: calculateTrends(monthlyData),
    };

    const prompt = `Analyze this financial data and predict monthly income and expenses for the next 24 months.
    
Historical Data:
${JSON.stringify(summary, null, 2)}

Return ONLY a JSON array with exactly 24 objects, each with:
- month: "YYYY-MM" format starting from next month
- predictedIncome: number (predicted monthly income)
- predictedExpenses: number (predicted monthly expenses)  
- confidence: "high" | "medium" | "low" (prediction confidence)

Base predictions on historical trends, seasonal patterns, and growth/decline patterns.`;

    const response = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        { role: 'system', content: 'You are a financial analyst AI. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return generateFallbackPredictions(transactions);
    }

    const predictions = JSON.parse(content);
    return Array.isArray(predictions) ? predictions.slice(0, 24) : generateFallbackPredictions(transactions);
  } catch (error) {
    console.error('AI prediction error:', error);
    return generateFallbackPredictions(transactions);
  }
}

export async function analyzeSpendingPatterns(
  transactions: Transaction[],
  openaiApiKey: string,
  aiModel: string = 'gpt-4o',
  categories: any[] = []
): Promise<SpendingPattern[]> {
  if (!openaiApiKey) {
    return generateFallbackPatterns(transactions, categories);
  }

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Group transactions by category
    const categoryData = aggregateCategoryData(transactions);

    const prompt = `Analyze these spending patterns and provide insights.

Category Data:
${JSON.stringify(categoryData, null, 2)}

Return ONLY a JSON array of spending patterns, each with:
- category: string (category name)
- averageMonthly: number (average monthly spending)
- trend: "increasing" | "decreasing" | "stable"
- insight: string (brief actionable insight about this spending)

Focus on the top spending categories and identify concerning trends.`;

    const response = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        { role: 'system', content: 'You are a financial analyst AI. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return generateFallbackPatterns(transactions, categories);
    }

    const patterns = JSON.parse(content);
    return Array.isArray(patterns) ? patterns : generateFallbackPatterns(transactions, categories);
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return generateFallbackPatterns(transactions, categories);
  }
}

export async function generateSavingsRecommendations(
  transactions: Transaction[],
  currentSavingsRate: number,
  openaiApiKey: string,
  aiModel: string = 'gpt-4o'
): Promise<SavingsRecommendation[]> {
  if (!openaiApiKey) {
    return generateFallbackRecommendations(transactions, currentSavingsRate);
  }

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const monthlyData = aggregateMonthlyData(transactions);
    const categoryData = aggregateCategoryData(transactions);

    const prompt = `Analyze this financial data and provide personalized savings recommendations.

Monthly Summary:
${JSON.stringify(monthlyData.slice(-6), null, 2)}

Category Spending:
${JSON.stringify(categoryData, null, 2)}

Current Savings Rate: ${(currentSavingsRate * 100).toFixed(1)}%

Return ONLY a JSON array of 3-5 recommendations, each with:
- type: "reduce_spending" | "increase_income" | "optimize_budget" | "emergency_fund"
- title: string (short recommendation title)
- description: string (detailed actionable advice)
- potentialSavings: number (estimated monthly savings in INR)
- priority: "high" | "medium" | "low"

Prioritize high-impact, actionable recommendations based on the data.`;

    const response = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        { role: 'system', content: 'You are a financial advisor AI. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return generateFallbackRecommendations(transactions, currentSavingsRate);
    }

    const recommendations = JSON.parse(content);
    return Array.isArray(recommendations) ? recommendations : generateFallbackRecommendations(transactions, currentSavingsRate);
  } catch (error) {
    console.error('Recommendations error:', error);
    return generateFallbackRecommendations(transactions, currentSavingsRate);
  }
}

// Helper functions
function aggregateMonthlyData(transactions: Transaction[]) {
  const monthlyMap = new Map<string, { income: number; expenses: number }>();

  transactions.forEach(t => {
    const month = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
    const existing = monthlyMap.get(month) || { income: 0, expenses: 0 };

    if (t.type === 'income') {
      existing.income += Number(t.amount);
    } else {
      existing.expenses += Number(t.amount);
    }

    monthlyMap.set(month, existing);
  });

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function aggregateCategoryData(transactions: Transaction[]) {
  const categoryMap = new Map<string, { total: number; count: number; categoryId: string }>();

  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const key = t.categoryId;
      const existing = categoryMap.get(key) || { total: 0, count: 0, categoryId: t.categoryId };
      existing.total += Number(t.amount);
      existing.count += 1;
      categoryMap.set(key, existing);
    });

  return Array.from(categoryMap.entries())
    .map(([_, data]) => data)
    .sort((a, b) => b.total - a.total);
}

function calculateTrends(monthlyData: Array<{ month: string; income: number; expenses: number }>) {
  if (monthlyData.length < 3) return { income: 'stable', expenses: 'stable' };

  const recentMonths = monthlyData.slice(-3);
  const avgIncome = recentMonths.reduce((sum, m) => sum + m.income, 0) / 3;
  const avgExpenses = recentMonths.reduce((sum, m) => sum + m.expenses, 0) / 3;

  // Handle case when we have fewer than 6 months of data
  if (monthlyData.length < 6) {
    return { income: 'stable', expenses: 'stable' };
  }

  const olderMonths = monthlyData.slice(-6, -3);
  const oldAvgIncome = olderMonths.length > 0 
    ? olderMonths.reduce((sum, m) => sum + m.income, 0) / olderMonths.length 
    : 0;
  const oldAvgExpenses = olderMonths.length > 0 
    ? olderMonths.reduce((sum, m) => sum + m.expenses, 0) / olderMonths.length 
    : 0;

  return {
    income: oldAvgIncome > 0 && avgIncome > oldAvgIncome * 1.1 ? 'increasing' : oldAvgIncome > 0 && avgIncome < oldAvgIncome * 0.9 ? 'decreasing' : 'stable',
    expenses: oldAvgExpenses > 0 && avgExpenses > oldAvgExpenses * 1.1 ? 'increasing' : oldAvgExpenses > 0 && avgExpenses < oldAvgExpenses * 0.9 ? 'decreasing' : 'stable',
  };
}

// Fallback functions (when AI is unavailable)
function generateFallbackPredictions(transactions: Transaction[]): PredictionData[] {
  const monthlyData = aggregateMonthlyData(transactions);
  if (monthlyData.length === 0) {
    return Array.from({ length: 24 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      return {
        month: date.toISOString().slice(0, 7),
        predictedIncome: 0,
        predictedExpenses: 0,
        confidence: 'low' as const,
      };
    });
  }

  // Simple average-based prediction
  const avgIncome = monthlyData.reduce((sum, m) => sum + m.income, 0) / monthlyData.length;
  const avgExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0) / monthlyData.length;

  return Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i + 1);
    return {
      month: date.toISOString().slice(0, 7),
      predictedIncome: Math.round(avgIncome),
      predictedExpenses: Math.round(avgExpenses),
      confidence: monthlyData.length >= 6 ? 'medium' : 'low' as const,
    };
  });
}

function generateFallbackPatterns(transactions: Transaction[], categories: any[] = []): SpendingPattern[] {
  const categoryData = aggregateCategoryData(transactions);
  const totalMonths = new Set(transactions.map(t => new Date(t.date).toISOString().slice(0, 7))).size || 1;

  return categoryData.slice(0, 5).map(cat => {
    // Look up the category name from the categories array
    const category = categories.find(c => c.id === cat.categoryId);
    const categoryName = category?.name || 'Uncategorized';
    
    return {
      category: categoryName, // Use name instead of ID
      averageMonthly: Math.round(cat.total / totalMonths),
      trend: 'stable' as const,
      insight: `You spend an average of ₹${Math.round(cat.total / totalMonths)} per month in ${categoryName}.`,
    };
  });
}

function generateFallbackRecommendations(transactions: Transaction[], savingsRate: number): SavingsRecommendation[] {
  const recommendations: SavingsRecommendation[] = [];

  if (savingsRate < 0.2) {
    recommendations.push({
      type: 'optimize_budget',
      title: 'Increase Your Savings Rate',
      description: 'Your current savings rate is below 20%. Try to allocate at least 20% of your income to savings for financial stability.',
      potentialSavings: 5000,
      priority: 'high',
    });
  }

  recommendations.push({
    type: 'emergency_fund',
    title: 'Build an Emergency Fund',
    description: 'Aim to save 3-6 months of expenses as an emergency fund for unexpected situations.',
    potentialSavings: 0,
    priority: 'high',
  });

  const categoryData = aggregateCategoryData(transactions);
  if (categoryData.length > 0) {
    const topCategory = categoryData[0];
    recommendations.push({
      type: 'reduce_spending',
      title: 'Review Top Spending Category',
      description: `Consider reviewing your spending in this category to identify potential savings opportunities.`,
      potentialSavings: Math.round(topCategory.total * 0.1),
      priority: 'medium',
    });
  }

  return recommendations;
}
