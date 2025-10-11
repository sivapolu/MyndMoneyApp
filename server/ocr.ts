import FormData from 'form-data';
import OpenAI from 'openai';
import { decryptApiKey } from './auth';

interface OCRResult {
  merchant?: string;
  date?: string;
  total?: number;
  currency?: string;
  items?: Array<{ description: string; amount: number }>;
  rawText: string;
}

/**
 * Extract structured data from receipt/bill using OpenAI Vision API
 */
export async function extractDataWithVision(
  imageBuffer: Buffer,
  encryptedApiKey?: string,
  aiModel: string = 'gpt-4o-mini'
): Promise<OCRResult> {
  if (!encryptedApiKey) {
    throw new Error('OpenAI API key required for OCR scanning. Please add your key in Settings.');
  }

  try {
    const apiKey = decryptApiKey(encryptedApiKey);
    const openai = new OpenAI({ apiKey });

    // Convert image buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = detectImageType(imageBuffer);

    // First, detect if this is a bank statement by analyzing the image
    const detectionResponse = await openai.chat.completions.create({
      model: aiModel.includes('vision') || aiModel.includes('4o') ? aiModel : 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `Analyze this image and determine if it's a bank statement with multiple transactions or a single receipt/bill. Return JSON: {"type": "bank_statement" or "receipt", "hasMultipleTransactions": true/false}` 
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 100,
    });

    const detectionContent = detectionResponse.choices[0]?.message?.content;
    const detection = detectionContent ? JSON.parse(detectionContent) : { type: 'receipt' };
    const isBankStatement = detection.type === 'bank_statement' || detection.hasMultipleTransactions;

    // Choose prompt based on document type
    const prompt = isBankStatement
      ? `You are a bank statement analyzer. Extract ALL transactions from this bank statement image and return them in JSON format:

{
  "merchant": "Bank name",
  "currency": "INR",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description", 
      "amount": <amount as number>,
      "type": "debit" or "credit"
    }
  ]
}

Rules:
- Extract EVERY single transaction visible in the image
- Look for columns like Date, Transaction Details, Withdrawal, Deposit, etc.
- Identify deposits/credits as type "credit" (income)
- Identify withdrawals/debits as type "debit" (expense)
- Detect currency from symbols ($, €, ₹, £) or headers
- Convert dates to YYYY-MM-DD format
- Return ONLY valid JSON with ALL transactions`
      : `You are a receipt/bill OCR expert. Analyze this image and extract the following information in JSON format:

{
  "merchant": "Store/Restaurant name",
  "date": "Transaction date in YYYY-MM-DD format",
  "total": <total amount as number>,
  "currency": "Currency code (USD, EUR, INR, GBP, etc.)",
  "items": [
    {"description": "item name", "amount": <price as number>}
  ],
  "rawText": "All visible text from the receipt"
}

Rules:
- Extract merchant name from the top of the receipt
- Find the total amount (may be labeled as Total, Amount, Grand Total, etc.)
- Detect the currency from symbols ($=USD, €=EUR, ₹=INR, £=GBP) or text (USD, EUR, INR, etc.)
- If no currency is found, default to "INR"
- Extract individual line items with their prices if visible
- Convert all amounts to numbers (remove currency symbols)
- If date is not found, return null
- Return only valid JSON`;

    const response = await openai.chat.completions.create({
      model: aiModel.includes('vision') || aiModel.includes('4o') ? aiModel : 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: isBankStatement ? 8000 : 1000,
    });

    const content = response.choices[0]?.message?.content;
    const finishReason = response.choices[0]?.finish_reason;
    
    if (!content) {
      throw new Error('No response from OpenAI Vision');
    }

    // Check if response was truncated
    if (finishReason === 'length') {
      console.warn('OpenAI Vision response was truncated due to token limit');
      throw new Error('Bank statement image is too large. The AI response was truncated. Please try a smaller image or fewer transactions.');
    }

    const parsed = JSON.parse(content);
    
    // Handle bank statements with multiple transactions
    if (isBankStatement && parsed.transactions) {
      return {
        merchant: parsed.merchant || 'Bank Statement',
        currency: parsed.currency || 'INR',
        items: parsed.transactions || [],
        rawText: `Bank Statement with ${parsed.transactions?.length || 0} transactions`,
      };
    }
    
    // Handle regular receipts
    return {
      merchant: parsed.merchant || undefined,
      date: parsed.date || undefined,
      total: parsed.total ? Number(parsed.total) : undefined,
      currency: parsed.currency || 'INR',
      items: parsed.items || undefined,
      rawText: parsed.rawText || '',
    };
  } catch (error: any) {
    console.error('OpenAI Vision OCR error:', error);
    throw new Error(error.message || 'Failed to extract data from image');
  }
}

/**
 * Fallback: Extract text from receipt/bill image using OCR.space API
 */
export async function extractTextFromImage(imageBuffer: Buffer, apiKey?: string): Promise<string> {
  const ocrApiKey = apiKey || process.env.OCR_SPACE_API_KEY || 'helloworld'; // Free tier key
  
  const formData = new FormData();
  formData.append('file', imageBuffer, {
    filename: 'receipt.jpg',
    contentType: 'image/jpeg',
  });
  formData.append('apikey', ocrApiKey);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
    }

    const parsedText = result.ParsedResults?.[0]?.ParsedText || '';
    return parsedText;
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Detect image MIME type from buffer
 */
function detectImageType(buffer: Buffer): string {
  const header = buffer.toString('hex', 0, 4);
  
  if (header.startsWith('ffd8')) return 'image/jpeg';
  if (header.startsWith('8950')) return 'image/png';
  if (header.startsWith('4749')) return 'image/gif';
  if (header.startsWith('4257')) return 'image/webp';
  
  return 'image/jpeg'; // default
}

/**
 * Extract data from PDF receipt using text extraction + OpenAI parsing
 */
export async function extractDataFromPDF(
  pdfBuffer: Buffer,
  encryptedApiKey?: string,
  aiModel: string = 'gpt-4o-mini'
): Promise<OCRResult> {
  if (!encryptedApiKey) {
    throw new Error('OpenAI API key required for PDF scanning. Please add your key in Settings.');
  }

  try {
    // Extract text from PDF using dynamic import (pdf-parse v2 class-based API)
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    await parser.destroy(); // Clean up resources
    
    const extractedText = textResult.text;

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text found in PDF');
    }

    // Use OpenAI to parse the extracted text
    const apiKey = decryptApiKey(encryptedApiKey);
    const openai = new OpenAI({ apiKey });

    // Check if this is a bank statement (contains multiple transactions)
    const isBankStatement = extractedText.toLowerCase().includes('statement') || 
                            (extractedText.match(/(\d{2}\/\d{2}\/\d{2,4})/g)?.length || 0) > 5;

    const prompt = isBankStatement 
      ? `You are a bank statement analyzer. Extract ALL transactions from this bank statement and return them in JSON format.

{
  "merchant": "Bank name",
  "currency": "INR",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
      "amount": <amount as number>,
      "type": "debit" or "credit"
    }
  ]
}

Rules:
- Extract EVERY transaction from the statement
- Identify deposits/credits as type "credit" (income)
- Identify withdrawals/debits as type "debit" (expense) 
- Detect currency from symbols ($, €, ₹, £) or country
- Convert dates to YYYY-MM-DD format
- Return ONLY valid JSON

Bank Statement:
${extractedText.substring(0, 15000)}`
      : `You are a receipt/bill OCR expert. Analyze this text and extract the following in JSON format:

{
  "merchant": "Store/Restaurant name",
  "date": "YYYY-MM-DD",
  "total": <total amount>,
  "currency": "Currency code",
  "items": [{"description": "item", "amount": <price>}],
  "rawText": "All text"
}

Rules:
- Extract merchant, total, currency, items
- Detect currency from symbols ($=USD, €=EUR, ₹=INR, £=GBP)
- Default to "INR" if no currency found
- Return ONLY valid JSON

Receipt:
${extractedText}`;

    const response = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: 'system',
          content: 'You are a financial assistant that extracts structured data from receipts and bank statements.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: isBankStatement ? 8000 : 1000,
    });

    const content = response.choices[0]?.message?.content;
    const finishReason = response.choices[0]?.finish_reason;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Check if response was truncated due to token limit
    if (finishReason === 'length') {
      console.warn('OpenAI response was truncated due to token limit');
      throw new Error('Bank statement is too large. The AI response was truncated. Please try uploading a statement with fewer transactions or contact support.');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError: any) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('OpenAI Response (first 500 chars):', content.substring(0, 500));
      console.error('OpenAI Response (last 200 chars):', content.substring(Math.max(0, content.length - 200)));
      console.error('Finish reason:', finishReason);
      throw new Error(`Failed to parse AI response. The response may be incomplete or malformed.`);
    }
    
    // Handle bank statements with multiple transactions
    if (isBankStatement && parsed.transactions) {
      return {
        merchant: parsed.merchant || 'Bank Statement',
        currency: parsed.currency || 'INR',
        items: parsed.transactions || [],
        rawText: `Bank Statement with ${parsed.transactions?.length || 0} transactions`,
      };
    }
    
    // Handle regular receipts
    return {
      merchant: parsed.merchant || undefined,
      date: parsed.date || undefined,
      total: parsed.total ? Number(parsed.total) : undefined,
      currency: parsed.currency || 'INR',
      items: parsed.items || undefined,
      rawText: extractedText.substring(0, 1000),
    };
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    throw new Error(error.message || 'Failed to extract data from PDF');
  }
}

/**
 * Parse receipt text to extract structured data
 * Uses regex patterns to identify merchant, date, total, and items
 */
export function parseReceiptText(text: string): OCRResult {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  let merchant: string | undefined;
  let date: string | undefined;
  let total: number | undefined;
  const items: Array<{ description: string; amount: number }> = [];

  // Patterns for common receipt formats
  const totalPatterns = [
    /total[\s:]*[₹$€£]?\s*([\d,]+\.?\d*)/i,
    /amount[\s:]*[₹$€£]?\s*([\d,]+\.?\d*)/i,
    /grand total[\s:]*[₹$€£]?\s*([\d,]+\.?\d*)/i,
    /^[₹$€£]?\s*([\d,]+\.?\d*)$/,
  ];

  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
  ];

  const itemPatterns = [
    /^(.+?)\s+[₹$€£]?\s*([\d,]+\.?\d*)$/,
    /^(.+?)\s+([\d,]+\.?\d*)\s*$/,
  ];

  // Extract merchant (usually first non-empty line or prominent name)
  if (lines.length > 0) {
    // Skip lines that look like headers or IDs
    for (const line of lines.slice(0, 3)) {
      if (
        line.length > 3 &&
        !line.match(/^(invoice|receipt|bill|tax|gst)/i) &&
        !line.match(/^\d+$/)
      ) {
        merchant = line;
        break;
      }
    }
  }

  // Extract date
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        date = match[1];
        break;
      }
    }
    if (date) break;
  }

  // Extract total amount
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
          total = amount;
          break;
        }
      }
    }
    if (total) break;
  }

  // Extract line items (description and amount)
  for (const line of lines) {
    // Skip if this line contains the total we already found
    if (total && line.toLowerCase().includes('total')) continue;
    if (date && line.includes(date)) continue;

    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match) {
        const description = match[1].trim();
        const amountStr = match[2].replace(/,/g, '');
        const amount = parseFloat(amountStr);

        if (
          !isNaN(amount) &&
          amount > 0 &&
          amount !== total && // Don't add total as an item
          description.length > 2 &&
          !description.match(/^(sub|tax|total|gst|discount)/i)
        ) {
          items.push({ description, amount });
        }
      }
    }
  }

  return {
    merchant,
    date,
    total,
    items: items.length > 0 ? items : undefined,
    rawText: text,
  };
}

/**
 * Process receipt image and extract transaction data
 */
export async function processReceiptImage(
  imageBuffer: Buffer,
  ocrApiKey?: string
): Promise<OCRResult> {
  // Extract text using OCR
  const text = await extractTextFromImage(imageBuffer, ocrApiKey);
  
  // Parse structured data from text
  const result = parseReceiptText(text);
  
  return result;
}
