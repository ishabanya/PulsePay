import { db } from '../config/firebase';
import { ExchangeRate } from '../types';
import { createError } from '../middleware/errorHandler';

interface ExchangeRateAPI {
  rates: Record<string, number>;
  base: string;
  date: string;
}

export class CurrencyService {
  private static readonly API_KEY = process.env.EXCHANGE_RATE_API_KEY;
  private static readonly BASE_URL = 'https://api.exchangerate-api.com/v4/latest';
  private static readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds

  // Supported currencies with their symbols and decimal places
  static readonly SUPPORTED_CURRENCIES = {
    'USD': { symbol: '$', decimals: 2, name: 'US Dollar' },
    'EUR': { symbol: '€', decimals: 2, name: 'Euro' },
    'GBP': { symbol: '£', decimals: 2, name: 'British Pound' },
    'JPY': { symbol: '¥', decimals: 0, name: 'Japanese Yen' },
    'CAD': { symbol: 'C$', decimals: 2, name: 'Canadian Dollar' },
    'AUD': { symbol: 'A$', decimals: 2, name: 'Australian Dollar' },
    'CHF': { symbol: 'CHF', decimals: 2, name: 'Swiss Franc' },
    'CNY': { symbol: '¥', decimals: 2, name: 'Chinese Yuan' },
    'INR': { symbol: '₹', decimals: 2, name: 'Indian Rupee' },
    'BRL': { symbol: 'R$', decimals: 2, name: 'Brazilian Real' },
    'MXN': { symbol: '$', decimals: 2, name: 'Mexican Peso' },
    'SGD': { symbol: 'S$', decimals: 2, name: 'Singapore Dollar' },
    'KRW': { symbol: '₩', decimals: 0, name: 'South Korean Won' },
    'NOK': { symbol: 'kr', decimals: 2, name: 'Norwegian Krone' },
    'SEK': { symbol: 'kr', decimals: 2, name: 'Swedish Krona' },
    'DKK': { symbol: 'kr', decimals: 2, name: 'Danish Krone' },
    'PLN': { symbol: 'zł', decimals: 2, name: 'Polish Zloty' },
    'CZK': { symbol: 'Kč', decimals: 2, name: 'Czech Koruna' },
    'HUF': { symbol: 'Ft', decimals: 0, name: 'Hungarian Forint' },
    'RUB': { symbol: '₽', decimals: 2, name: 'Russian Ruble' }
  };

  static async getExchangeRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;

    // Check cache first
    const cached = await this.getCachedRate(from, to);
    if (cached && this.isRateValid(cached)) {
      return cached.rate;
    }

    try {
      // Fetch from API
      const response = await fetch(`${this.BASE_URL}/${from}`);
      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.statusText}`);
      }

      const data = await response.json() as ExchangeRateAPI;
      const rate = data.rates[to];

      if (!rate) {
        throw new Error(`Exchange rate not found for ${from} to ${to}`);
      }

      // Cache the rate
      await this.cacheRate(from, to, rate);

      return rate;
    } catch (error: any) {
      console.error('Error fetching exchange rate:', error);
      
      // Fallback to cached rate if API fails
      if (cached) {
        console.log('Using cached exchange rate due to API error');
        return cached.rate;
      }

      throw createError(`Unable to get exchange rate for ${from} to ${to}`, 500);
    }
  }

  static async convertAmount(amount: number, from: string, to: string): Promise<{
    convertedAmount: number;
    exchangeRate: number;
    originalAmount: number;
    originalCurrency: string;
  }> {
    const rate = await this.getExchangeRate(from, to);
    const convertedAmount = Math.round(amount * rate);

    return {
      convertedAmount,
      exchangeRate: rate,
      originalAmount: amount,
      originalCurrency: from
    };
  }

  static async getSupportedCurrencies(): Promise<typeof CurrencyService.SUPPORTED_CURRENCIES> {
    return this.SUPPORTED_CURRENCIES;
  }

  static formatCurrency(amount: number, currency: string): string {
    const currencyInfo = this.SUPPORTED_CURRENCIES[currency as keyof typeof this.SUPPORTED_CURRENCIES];
    if (!currencyInfo) return `${amount} ${currency}`;

    const formatted = (amount / 100).toFixed(currencyInfo.decimals);
    return `${currencyInfo.symbol}${formatted}`;
  }

  static getCurrencyInfo(currency: string) {
    return this.SUPPORTED_CURRENCIES[currency as keyof typeof this.SUPPORTED_CURRENCIES];
  }

  private static async getCachedRate(from: string, to: string): Promise<ExchangeRate | null> {
    try {
      const doc = await db
        .collection('exchange_rates')
        .doc(`${from}_${to}`)
        .get();

      if (doc.exists) {
        const data = doc.data();
        return {
          from,
          to,
          rate: data!.rate,
          timestamp: data!.timestamp.toDate()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting cached rate:', error);
      return null;
    }
  }

  private static async cacheRate(from: string, to: string, rate: number): Promise<void> {
    try {
      await db
        .collection('exchange_rates')
        .doc(`${from}_${to}`)
        .set({
          rate,
          timestamp: new Date()
        });
    } catch (error) {
      console.error('Error caching rate:', error);
    }
  }

  private static isRateValid(exchangeRate: ExchangeRate): boolean {
    const now = new Date();
    const age = now.getTime() - exchangeRate.timestamp.getTime();
    return age < this.CACHE_DURATION;
  }

  // Get exchange rates for multiple currencies
  static async getMultipleRates(base: string, targets: string[]): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    
    for (const target of targets) {
      try {
        rates[target] = await this.getExchangeRate(base, target);
      } catch (error) {
        console.error(`Failed to get rate for ${base} to ${target}:`, error);
        rates[target] = 1; // Fallback to 1:1 ratio
      }
    }

    return rates;
  }

  // Validate if currency is supported
  static isCurrencySupported(currency: string): boolean {
    return currency.toUpperCase() in this.SUPPORTED_CURRENCIES;
  }

  // Get regional default currencies
  static getRegionalCurrency(country: string): string {
    const regionalCurrencies: Record<string, string> = {
      'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR',
      'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR',
      'JP': 'JPY', 'AU': 'AUD', 'CH': 'CHF', 'CN': 'CNY', 'IN': 'INR',
      'BR': 'BRL', 'MX': 'MXN', 'SG': 'SGD', 'KR': 'KRW', 'NO': 'NOK',
      'SE': 'SEK', 'DK': 'DKK', 'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF',
      'RU': 'RUB'
    };

    return regionalCurrencies[country.toUpperCase()] || 'USD';
  }
}