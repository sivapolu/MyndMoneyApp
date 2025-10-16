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

export interface MultiParseResult {
  transactions: ParsedExpense[];
  errors?: Array<{ index: number; message: string }>;
}

export async function parseExpenseFromText(
  text: string, 
  aiModel: string = "gpt-4.1-mini",
  userOpenAIKey?: string | null,
  typeHint?: 'expense' | 'income'
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
    return basicParse(text, typeHint);
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const typeInstruction = typeHint ? `The user indicated this is an ${typeHint}.` : '';
    
    const prompt = `Parse the following expense or income text and extract structured information. 
Current Date Context: Today is ${currentDayName}, ${currentDate}

IMPORTANT: Only accept PAST dates or TODAY. Do NOT accept future dates. If a future date is mentioned, use today's date instead.

Return a JSON object with: amount (number), type ("expense" or "income"), category (one of: Food, Transport, Shopping, Bills, Entertainment, Healthcare, Education, Travel, Salary, Freelance, Investment, Gift, Other), description (brief text), date (ISO string YYYY-MM-DD format - calculate relative dates like "yesterday", "last Saturday", "last week" based on today's date, default to today if not mentioned), notes (optional).
${typeInstruction}

Examples of date parsing (PAST DATES ONLY):
- "yesterday" → calculate date for yesterday based on ${currentDate}
- "last Saturday" → calculate the most recent Saturday before today
- "5th Oct" or "Oct 5" → 2025-10-05 (only if this is in the past)
- "3 days ago" → calculate date 3 days before ${currentDate}
- "tomorrow" or any future date → use ${currentDate} instead
- No date mentioned → use ${currentDate}

Text: "${text}"

Return only valid JSON.`;

    const completion = await openaiClient.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: "You are a financial assistant that parses expense and income entries from natural language. You are excellent at understanding relative dates and converting them to ISO format based on the current date context provided." },
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
      type: parsed.type || typeHint || 'expense',
      category: parsed.category || 'Other',
      description: parsed.description || text,
      date: parsed.date,
      notes: parsed.notes,
    };
  } catch (error) {
    console.error('AI parsing failed, using basic parsing:', error);
    return basicParse(text, typeHint);
  }
}

export async function parseMultiExpenseFromText(
  text: string,
  aiModel: string = "gpt-4.1-mini",
  userOpenAIKey?: string | null,
  typeHint?: 'expense' | 'income'
): Promise<MultiParseResult> {
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
  
  // If no AI client available, use basic multi-parsing
  if (!openaiClient) {
    return basicMultiParse(text, typeHint);
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const typeInstruction = typeHint ? `The user indicated these are ${typeHint}s.` : '';
    
    const prompt = `Parse the following text that may contain one or multiple expenses or income entries. Extract all transactions mentioned.
Current Date Context: Today is ${currentDayName}, ${currentDate}

IMPORTANT: Only accept PAST dates or TODAY. Do NOT accept future dates. If a future date is mentioned, use today's date instead.

Return a JSON object with a "transactions" array. Each transaction should have: amount (number), type ("expense" or "income"), category (one of: Food, Transport, Shopping, Bills, Entertainment, Healthcare, Education, Travel, Salary, Freelance, Investment, Gift, Other), description (brief text), date (ISO string YYYY-MM-DD format - calculate relative dates like "yesterday", "last Saturday", "last week" based on today's date, default to today if not mentioned), notes (optional).
${typeInstruction}

Examples of transaction parsing:
- "Spent 500 on cab" → one transaction with today's date
- "Cab 500 yesterday, Food 300 today" → two transactions with calculated dates
- "I spent 500 on cab last Saturday and 300 on food yesterday" → two transactions with calculated relative dates
- "Cab 500, Food 300, Shopping 600" → three transactions with today's date

Examples of date parsing (PAST DATES ONLY):
- "yesterday" → calculate date for yesterday based on ${currentDate}
- "last Saturday" → calculate the most recent Saturday before today
- "5th Oct" or "Oct 5" → 2025-10-05 (only if this is in the past)
- "3 days ago" → calculate date 3 days before ${currentDate}
- "tomorrow" or any future date → use ${currentDate} instead
- No date mentioned → use ${currentDate}

Text: "${text}"

Return only valid JSON with format: {"transactions": [...]}.`;

    const completion = await openaiClient.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: "You are a financial assistant that parses single or multiple expense and income entries from natural language. You are excellent at understanding relative dates and converting them to ISO format based on the current date context provided." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to parse expenses");
    }

    const parsed = JSON.parse(content);
    
    // Ensure we have a transactions array
    if (!Array.isArray(parsed.transactions)) {
      throw new Error('AI response missing transactions array');
    }
    
    const transactions: ParsedExpense[] = [];
    const errors: Array<{ index: number; message: string }> = [];
    
    for (let i = 0; i < parsed.transactions.length; i++) {
      const t = parsed.transactions[i];
      
      if (!t || typeof t !== 'object') {
        errors.push({ index: i, message: 'Invalid transaction object' });
        continue;
      }
      
      // Parse and validate amount
      const amount = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount || ''));
      if (!Number.isFinite(amount)) {
        errors.push({ index: i, message: `Invalid amount: ${t.amount}` });
        continue;
      }
      if (amount <= 0) {
        errors.push({ index: i, message: `Amount must be positive: ${amount}` });
        continue;
      }
      
      // Validate type - must be exactly 'income' or 'expense'
      const type = t.type;
      if (type !== 'income' && type !== 'expense') {
        // If type hint provided, use it; otherwise error
        if (!typeHint) {
          errors.push({ index: i, message: `Invalid type: ${type} (must be 'income' or 'expense')` });
          continue;
        }
      }
      
      transactions.push({
        amount,
        type: (type === 'income' || type === 'expense') ? type : typeHint!,
        category: String(t.category || 'Other'),
        description: String(t.description || text),
        date: t.date || undefined,
        notes: t.notes ? String(t.notes) : undefined,
      });
    }
    
    // If no valid transactions but had AI response, return errors
    if (transactions.length === 0 && errors.length > 0) {
      return { transactions: [], errors };
    }
    
    // If no transactions at all (empty AI response), fall back to single parse and validate
    if (transactions.length === 0) {
      const singleParsed = await parseExpenseFromText(text, aiModel, userOpenAIKey, typeHint);
      // Validate the single-parsed result
      if (!Number.isFinite(singleParsed.amount) || singleParsed.amount <= 0) {
        return { 
          transactions: [], 
          errors: [{ index: 0, message: `Invalid amount from single parse: ${singleParsed.amount}` }]
        };
      }
      if (singleParsed.type !== 'income' && singleParsed.type !== 'expense') {
        return { 
          transactions: [], 
          errors: [{ index: 0, message: `Invalid type from single parse: ${singleParsed.type}` }]
        };
      }
      return { transactions: [singleParsed] };
    }
    
    return { transactions, errors: errors.length > 0 ? errors : undefined };
  } catch (error) {
    console.error('AI multi-parsing failed, using basic parsing:', error);
    return basicMultiParse(text, typeHint);
  }
}

// Basic fallback parsing without AI
function basicParse(text: string, typeHint?: 'expense' | 'income'): ParsedExpense {
  const lowerText = text.toLowerCase();
  
  // Extract amount (look for numbers with optional currency symbols)
  const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
  
  // Determine type (use hint if provided, otherwise detect from text)
  const isIncome = lowerText.includes('earned') || lowerText.includes('received') || 
                   lowerText.includes('salary') || lowerText.includes('income') ||
                   lowerText.includes('freelance') || lowerText.includes('gift');
  const type = typeHint || (isIncome ? 'income' : 'expense');
  
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

// Basic multi-parse fallback without AI
function basicMultiParse(text: string, typeHint?: 'expense' | 'income'): MultiParseResult {
  const lowerText = text.toLowerCase();
  
  // Try to detect multiple transactions separated by comma, "and", or line breaks
  const separators = /[,\n]|\s+and\s+/gi;
  const parts = text.split(separators).filter(part => part.trim().length > 0);
  
  // If we only have one part, parse it as a single transaction and validate
  if (parts.length === 1) {
    const parsed = basicParse(text, typeHint);
    // Validate the result
    if (!Number.isFinite(parsed.amount) || parsed.amount <= 0) {
      return { 
        transactions: [], 
        errors: [{ index: 0, message: `Invalid amount: ${parsed.amount}` }] 
      };
    }
    return { transactions: [parsed] };
  }
  
  // Parse each part as a separate transaction
  const transactions: ParsedExpense[] = [];
  const errors: Array<{ index: number; message: string }> = [];
  
  for (let i = 0; i < parts.length; i++) {
    const trimmedPart = parts[i].trim();
    if (!trimmedPart) {
      errors.push({ index: i, message: 'Empty transaction' });
      continue;
    }
    
    // Look for pattern like "Category Amount" or "Amount Category" 
    const amountMatch = trimmedPart.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (!amountMatch) {
      errors.push({ index: i, message: `No amount found in: ${trimmedPart}` });
      continue;
    }
    
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ index: i, message: `Invalid amount: ${amount}` });
      continue;
    }
    
    const remainingText = trimmedPart.replace(amountMatch[0], '').trim();
    
    // Determine type
    const isIncome = lowerText.includes('earned') || lowerText.includes('received') || 
                     lowerText.includes('salary') || lowerText.includes('income');
    const type = typeHint || (isIncome ? 'income' : 'expense');
    
    // Try to detect category from the remaining text
    let category = 'Other';
    const partLower = trimmedPart.toLowerCase();
    if (partLower.includes('food') || partLower.includes('lunch') || partLower.includes('dinner')) category = 'Food';
    else if (partLower.includes('transport') || partLower.includes('cab') || partLower.includes('taxi') || partLower.includes('uber')) category = 'Transport';
    else if (partLower.includes('shopping') || partLower.includes('shop')) category = 'Shopping';
    else if (partLower.includes('bill') || partLower.includes('electricity') || partLower.includes('rent')) category = 'Bills';
    else if (partLower.includes('movie') || partLower.includes('entertainment')) category = 'Entertainment';
    else if (partLower.includes('salary')) category = 'Salary';
    else if (remainingText) category = remainingText; // Use the text as category if no match
    
    transactions.push({
      amount,
      type,
      category,
      description: trimmedPart,
      date: new Date().toISOString(),
    });
  }
  
  // If no transactions were parsed, check if we have errors
  if (transactions.length === 0) {
    if (errors.length > 0) {
      return { transactions: [], errors };
    }
    // If no errors either, fall back to single parse and validate
    const parsed = basicParse(text, typeHint);
    if (!Number.isFinite(parsed.amount) || parsed.amount <= 0) {
      return { 
        transactions: [], 
        errors: [{ index: 0, message: `Invalid amount: ${parsed.amount}` }] 
      };
    }
    return { transactions: [parsed] };
  }
  
  // Return transactions with errors if any
  return { transactions, errors: errors.length > 0 ? errors : undefined };
}
