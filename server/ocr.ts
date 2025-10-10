import FormData from 'form-data';

interface OCRResult {
  merchant?: string;
  date?: string;
  total?: number;
  items?: Array<{ description: string; amount: number }>;
  rawText: string;
}

/**
 * Extract text from receipt/bill image using OCR.space API
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
