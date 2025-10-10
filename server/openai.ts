import OpenAI from "openai";
import { decryptApiKey } from "./auth";

// Default Replit AI Integrations client (fallback)
const replitOpenAI = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  ? new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    })
  : null;

export interface ParsedExpense {
  amount: number;
  type: 'expense' | 'income';
  category: string;
  description: string;
  date?: string;
  notes?: string;
}

export async function parseExpenseFromText(
  text: string, 
  aiModel: string = "gpt-4.1-mini",
  userOpenAIKey?: string | null
): Promise<ParsedExpense> {
  // Try to use user's personal API key first
  let openaiClient: OpenAI | null = null;
  
  if (userOpenAIKey) {
    try {
      const decryptedKey = decryptApiKey(userOpenAIKey);
      openaiClient = new OpenAI({ apiKey: decryptedKey });
    } catch (error) {
      console.error('Failed to decrypt user API key, falling back:', error);
    }
  }
  
  // Fall back to Replit AI Integrations if available
  if (!openaiClient && replitOpenAI) {
    openaiClient = replitOpenAI;
  }
  
  // If no AI client available, use basic parsing
  if (!openaiClient) {
    return basicParse(text);
  }

  try {
    const prompt = `Parse the following expense or income text and extract structured information. 
Return a JSON object with: amount (number), type ("expense" or "income"), category (one of: Food, Transport, Shopping, Bills, Entertainment, Healthcare, Education, Travel, Salary, Freelance, Investment, Other), description (brief text), date (ISO string, default to today if not mentioned), notes (optional).

Text: "${text}"

Return only valid JSON.`;

    const completion = await openaiClient.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: "You are a financial assistant that parses expense and income entries from natural language." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to parse expense");
    }

    const parsed = JSON.parse(content);
    
    return {
      amount: parsed.amount,
      type: parsed.type || 'expense',
      category: parsed.category || 'Other',
      description: parsed.description || text,
      date: parsed.date,
      notes: parsed.notes,
    };
  } catch (error) {
    console.error('AI parsing failed, using basic parsing:', error);
    return basicParse(text);
  }
}

// Basic fallback parsing without AI
function basicParse(text: string): ParsedExpense {
  const lowerText = text.toLowerCase();
  
  // Extract amount (look for numbers with optional currency symbols)
  const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
  
  // Determine type
  const isIncome = lowerText.includes('earned') || lowerText.includes('received') || 
                   lowerText.includes('salary') || lowerText.includes('income');
  const type = isIncome ? 'income' : 'expense';
  
  // Basic category detection
  let category = 'Other';
  if (lowerText.includes('food') || lowerText.includes('lunch') || lowerText.includes('dinner')) category = 'Food';
  else if (lowerText.includes('transport') || lowerText.includes('uber') || lowerText.includes('taxi')) category = 'Transport';
  else if (lowerText.includes('shopping') || lowerText.includes('bought')) category = 'Shopping';
  else if (lowerText.includes('bill') || lowerText.includes('electricity') || lowerText.includes('rent')) category = 'Bills';
  else if (lowerText.includes('movie') || lowerText.includes('entertainment')) category = 'Entertainment';
  else if (lowerText.includes('salary')) category = 'Salary';
  
  return {
    amount,
    type,
    category,
    description: text,
    date: new Date().toISOString(),
  };
}
