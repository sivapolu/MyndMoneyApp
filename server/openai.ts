import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface ParsedExpense {
  amount: number;
  type: 'expense' | 'income';
  category: string;
  description: string;
  date?: string;
  notes?: string;
}

export async function parseExpenseFromText(text: string): Promise<ParsedExpense> {
  const prompt = `Parse the following expense or income text and extract structured information. 
Return a JSON object with: amount (number), type ("expense" or "income"), category (one of: Food, Transport, Shopping, Bills, Entertainment, Healthcare, Education, Travel, Salary, Freelance, Investment, Other), description (brief text), date (ISO string, default to today if not mentioned), notes (optional).

Text: "${text}"

Return only valid JSON.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
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
}
