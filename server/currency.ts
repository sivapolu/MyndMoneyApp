// Currency exchange rate handling using free API
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest';

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
}

let cachedRates: ExchangeRates | null = null;
let lastFetch = 0;
const CACHE_DURATION = 3600000; // 1 hour

export async function getExchangeRates(baseCurrency: string = 'INR'): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Return cached rates if available and fresh
  if (cachedRates && cachedRates.base === baseCurrency && now - lastFetch < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const response = await fetch(`${EXCHANGE_API_URL}/${baseCurrency}`);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    cachedRates = {
      base: data.base,
      rates: data.rates,
    };
    lastFetch = now;
    
    return cachedRates;
  } catch (error) {
    // If fetch fails and we have cached data, return it even if stale
    if (cachedRates && cachedRates.base === baseCurrency) {
      return cachedRates;
    }
    
    // Fallback to basic rates if API is unavailable
    return {
      base: baseCurrency,
      rates: {
        INR: 1,
        USD: baseCurrency === 'INR' ? 0.012 : 83.33,
        EUR: baseCurrency === 'INR' ? 0.011 : 90.91,
      },
    };
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates(fromCurrency);
  const rate = rates.rates[toCurrency];
  
  if (!rate) {
    throw new Error(`Exchange rate not available for ${toCurrency}`);
  }

  return amount * rate;
}
