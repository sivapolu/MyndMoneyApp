import OpenAI from 'openai';
import type { Transaction, Category } from "@shared/schema";

interface AnalyticsQuery {
  intent: 'expense_total' | 'expense_trend' | 'income_trend' | 'category_breakdown' | 'comparison' | 'general';
  category?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  comparisonPeriod?: string;
  transactionType?: 'expense' | 'income';
}

interface AnalyticsResponse {
  type: 'text' | 'chart' | 'table' | 'summary';
  data: any;
  summary: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area';
}

// Use AI to understand the user's analytical query
export async function parseAnalyticsQuery(
  query: string,
  aiModel: string,
  userOpenAIKey: string | null,
): Promise<AnalyticsQuery> {
  const openaiKey = userOpenAIKey || process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    // Fallback: basic pattern matching
    return parseQueryWithPatterns(query);
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    
    const prompt = `You are a financial analytics assistant. Analyze this user query and extract:
- intent: expense_total, expense_trend, income_trend, category_breakdown, comparison, or general
- category: specific category name if mentioned (e.g., "Travel", "Food", "Transportation")
- period: time period (e.g., "last month", "this year", "last 3 months", "last 6 months")
- startDate and endDate: YYYY-MM-DD format if specific dates mentioned
- comparisonPeriod: if comparing periods (e.g., "vs last month")
- transactionType: "income" if query is about income/salary/revenue/earnings, "expense" if about expenses/spending/costs, or null

User Query: "${query}"

Return ONLY a JSON object with these fields. Use null for missing fields.`;

    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: "You are a financial analytics query parser. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return parseQueryWithPatterns(query);
    }

    const parsed = JSON.parse(content);
    return {
      intent: parsed.intent || 'general',
      category: parsed.category || undefined,
      period: parsed.period || undefined,
      startDate: parsed.startDate || undefined,
      endDate: parsed.endDate || undefined,
      comparisonPeriod: parsed.comparisonPeriod || undefined,
      transactionType: parsed.transactionType || undefined,
    };
  } catch (error) {
    console.error('AI parsing error:', error);
    return parseQueryWithPatterns(query);
  }
}

// Fallback pattern matching
function parseQueryWithPatterns(query: string): AnalyticsQuery {
  const lower = query.toLowerCase();
  
  let intent: AnalyticsQuery['intent'] = 'general';
  let category: string | undefined;
  let period: string | undefined;
  let transactionType: 'expense' | 'income' | undefined;
  
  // Detect transaction type - income vs expense
  const incomeKeywords = ['salary', 'income', 'revenue', 'earning', 'earned', 'received'];
  const expenseKeywords = ['expense', 'spent', 'spending', 'cost', 'paid'];
  
  const hasIncomeKeyword = incomeKeywords.some(keyword => lower.includes(keyword));
  const hasExpenseKeyword = expenseKeywords.some(keyword => lower.includes(keyword));
  
  if (hasIncomeKeyword && !hasExpenseKeyword) {
    transactionType = 'income';
  } else if (hasExpenseKeyword && !hasIncomeKeyword) {
    transactionType = 'expense';
  }
  
  // Detect intent
  if (lower.includes('total') || lower.includes('how much')) {
    intent = transactionType === 'income' ? 'general' : 'expense_total';
  } else if (lower.includes('trend') || lower.includes('over time') || lower.includes('chart')) {
    intent = transactionType === 'income' ? 'income_trend' : 'expense_trend';
  } else if (lower.includes('breakdown') || lower.includes('categories')) {
    intent = 'category_breakdown';
  } else if (lower.includes('compare') || lower.includes('vs')) {
    intent = 'comparison';
  }
  
  // Detect common categories
  const categories = ['travel', 'food', 'transportation', 'shopping', 'entertainment', 'utilities', 'groceries', 'health'];
  for (const cat of categories) {
    if (lower.includes(cat)) {
      category = cat.charAt(0).toUpperCase() + cat.slice(1);
      break;
    }
  }
  
  // Detect period
  if (lower.includes('last month')) period = 'last month';
  else if (lower.includes('this month')) period = 'this month';
  else if (lower.includes('last 3 months') || lower.includes('last three months')) period = 'last 3 months';
  else if (lower.includes('last 6 months') || lower.includes('last six months')) period = 'last 6 months';
  else if (lower.includes('this year')) period = 'this year';
  else if (lower.includes('last year')) period = 'last year';
  
  return { intent, category, period, transactionType };
}

// Calculate date range from period string
function getDateRange(period?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date();
  let startDate = new Date();
  
  switch (period) {
    case 'last month':
      startDate.setMonth(now.getMonth() - 1);
      startDate.setDate(1);
      endDate.setDate(0); // Last day of last month
      break;
    case 'this month':
      startDate.setDate(1);
      break;
    case 'last 3 months':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'last 6 months':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'this year':
      startDate.setMonth(0);
      startDate.setDate(1);
      break;
    case 'last year':
      startDate.setFullYear(now.getFullYear() - 1, 0, 1);
      endDate.setFullYear(now.getFullYear() - 1, 11, 31);
      break;
    default:
      // Default to last 30 days
      startDate.setDate(now.getDate() - 30);
  }
  
  return { startDate, endDate };
}

// Generate analytics response based on query and data
export async function generateAnalyticsResponse(
  query: AnalyticsQuery,
  transactions: Transaction[],
  categories: Category[],
): Promise<AnalyticsResponse> {
  const { startDate, endDate } = getDateRange(query.period);
  
  // Filter transactions by date range
  let filteredTransactions = transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= startDate && txDate <= endDate;
  });
  
  // Filter by category if specified
  if (query.category) {
    const categoryMatch = categories.find(c => 
      c.name.toLowerCase().includes(query.category!.toLowerCase())
    );
    if (categoryMatch) {
      filteredTransactions = filteredTransactions.filter(t => t.categoryId === categoryMatch.id);
    }
  }
  
  switch (query.intent) {
    case 'expense_total': {
      const total = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const categoryName = query.category || 'all categories';
      const periodStr = query.period || 'the last 30 days';
      
      return {
        type: 'summary',
        data: { total, count: filteredTransactions.filter(t => t.type === 'expense').length },
        summary: `You spent ₹${total.toFixed(2)} on ${categoryName} in ${periodStr}.`,
      };
    }
    
    case 'expense_trend': {
      // Group by date with proper sorting
      const trendMap: Map<string, { date: Date; amount: number; displayDate: string }> = new Map();
      
      filteredTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const txDate = new Date(t.date);
          const isoKey = txDate.toISOString().split('T')[0]; // YYYY-MM-DD for unique key
          const displayDate = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          if (trendMap.has(isoKey)) {
            trendMap.get(isoKey)!.amount += Number(t.amount);
          } else {
            trendMap.set(isoKey, { date: txDate, amount: Number(t.amount), displayDate });
          }
        });
      
      // Sort by actual date and map to chart data
      const chartData = Array.from(trendMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(({ displayDate, amount }) => ({ date: displayDate, amount }));
      
      const categoryName = query.category || 'expenses';
      const total = chartData.reduce((sum, d) => sum + d.amount, 0);
      
      return {
        type: 'chart',
        chartType: 'area',
        data: chartData,
        summary: `Here's your ${categoryName} trend. Total: ₹${total.toFixed(2)}`,
      };
    }
    
    case 'income_trend': {
      // Group by date with proper sorting
      const trendMap: Map<string, { date: Date; amount: number; displayDate: string }> = new Map();
      
      filteredTransactions
        .filter(t => t.type === 'income')
        .forEach(t => {
          const txDate = new Date(t.date);
          const isoKey = txDate.toISOString().split('T')[0]; // YYYY-MM-DD for unique key
          const displayDate = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          if (trendMap.has(isoKey)) {
            trendMap.get(isoKey)!.amount += Number(t.amount);
          } else {
            trendMap.set(isoKey, { date: txDate, amount: Number(t.amount), displayDate });
          }
        });
      
      // Sort by actual date and map to chart data
      const chartData = Array.from(trendMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(({ displayDate, amount }) => ({ date: displayDate, amount }));
      
      const total = chartData.reduce((sum, d) => sum + d.amount, 0);
      const periodStr = query.period || 'the last 30 days';
      
      return {
        type: 'chart',
        chartType: 'area',
        data: chartData,
        summary: `Here's your income trend for ${periodStr}. Total: ₹${total.toFixed(2)}`,
      };
    }
    
    case 'category_breakdown': {
      const categoryTotals: { [key: string]: number } = {};
      
      filteredTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const category = categories.find(c => c.id === t.categoryId);
          const categoryName = category?.name || 'Uncategorized';
          categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + Number(t.amount);
        });
      
      const chartData = Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      const total = chartData.reduce((sum, d) => sum + d.value, 0);
      
      return {
        type: 'chart',
        chartType: 'pie',
        data: chartData,
        summary: `Here's your spending breakdown. Total: ₹${total.toFixed(2)}`,
      };
    }
    
    default: {
      // If category is specified, show category-specific data instead of general summary
      if (query.category) {
        const expenseTotal = filteredTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const periodStr = query.period || 'the last 30 days';
        const categoryName = query.category;
        
        // If there's data, show with trend chart; otherwise just show total
        if (filteredTransactions.length > 0) {
          // Group by date with proper sorting
          const trendMap: Map<string, { date: Date; amount: number; displayDate: string }> = new Map();
          
          filteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
              const txDate = new Date(t.date);
              const isoKey = txDate.toISOString().split('T')[0];
              const displayDate = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              if (trendMap.has(isoKey)) {
                trendMap.get(isoKey)!.amount += Number(t.amount);
              } else {
                trendMap.set(isoKey, { date: txDate, amount: Number(t.amount), displayDate });
              }
            });
          
          const chartData = Array.from(trendMap.values())
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(({ displayDate, amount }) => ({ date: displayDate, amount }));
          
          return {
            type: 'chart',
            chartType: 'area',
            data: chartData,
            summary: `${categoryName} expenses in ${periodStr}: ₹${expenseTotal.toFixed(2)} (${filteredTransactions.length} transactions)`,
          };
        } else {
          return {
            type: 'summary',
            data: { total: expenseTotal, count: 0 },
            summary: `No ${categoryName} expenses found in ${periodStr}.`,
          };
        }
      }
      
      // General response (no category specified)
      const expenseTotal = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const incomeTotal = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const periodStr = query.period || 'the last 30 days';
      
      return {
        type: 'summary',
        data: { expenses: expenseTotal, income: incomeTotal, count: filteredTransactions.length },
        summary: `In ${periodStr}:\n• Income: ₹${incomeTotal.toFixed(2)}\n• Expenses: ₹${expenseTotal.toFixed(2)}\n• Net: ₹${(incomeTotal - expenseTotal).toFixed(2)}`,
      };
    }
  }
}
