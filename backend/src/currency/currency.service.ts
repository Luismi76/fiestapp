import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export enum Currency {
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
}

export interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  lastUpdated: Date;
}

interface ExchangeRateApiResponse {
  rates: Record<string, number>;
}

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);

  // Default exchange rates (EUR as base) - used as fallback
  private exchangeRates: ExchangeRates = {
    base: Currency.EUR,
    rates: {
      [Currency.EUR]: 1,
      [Currency.USD]: 1.08,
      [Currency.GBP]: 0.86,
    },
    lastUpdated: new Date(),
  };

  // Currency symbols for display
  private readonly symbols: Record<Currency, string> = {
    [Currency.EUR]: '\u20ac',
    [Currency.USD]: '$',
    [Currency.GBP]: '\u00a3',
  };

  // Currency names
  private readonly names: Record<Currency, string> = {
    [Currency.EUR]: 'Euro',
    [Currency.USD]: 'US Dollar',
    [Currency.GBP]: 'British Pound',
  };

  async onModuleInit() {
    await this.updateRates();
  }

  /**
   * Convert amount from one currency to another
   */
  convert(amount: number, from: Currency, to: Currency): number {
    if (from === to) return amount;

    // Convert to EUR first (base currency)
    const amountInEur =
      from === Currency.EUR ? amount : amount / this.exchangeRates.rates[from];

    // Convert from EUR to target currency
    const result =
      to === Currency.EUR
        ? amountInEur
        : amountInEur * this.exchangeRates.rates[to];

    // Round to 2 decimal places
    return Math.round(result * 100) / 100;
  }

  /**
   * Get current exchange rates
   */
  getRates(): ExchangeRates {
    return this.exchangeRates;
  }

  /**
   * Get exchange rate between two currencies
   */
  getRate(from: Currency, to: Currency): number {
    if (from === to) return 1;

    const fromRate = this.exchangeRates.rates[from];
    const toRate = this.exchangeRates.rates[to];

    return Math.round((toRate / fromRate) * 10000) / 10000;
  }

  /**
   * Format amount with currency symbol
   */
  format(amount: number, currency: Currency, locale = 'es-ES'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Get currency symbol
   */
  getSymbol(currency: Currency): string {
    return this.symbols[currency] || currency;
  }

  /**
   * Get currency name
   */
  getName(currency: Currency): string {
    return this.names[currency] || currency;
  }

  /**
   * Get all available currencies
   */
  getAvailableCurrencies(): Array<{
    code: Currency;
    symbol: string;
    name: string;
  }> {
    return Object.values(Currency).map((code) => ({
      code,
      symbol: this.symbols[code],
      name: this.names[code],
    }));
  }

  /**
   * Convert prices object to target currency
   * Useful for converting experience prices in bulk
   */
  convertPrices(
    prices: { amount: number; currency: Currency }[],
    targetCurrency: Currency,
  ): {
    originalAmount: number;
    originalCurrency: Currency;
    convertedAmount: number;
  }[] {
    return prices.map((price) => ({
      originalAmount: price.amount,
      originalCurrency: price.currency,
      convertedAmount: this.convert(
        price.amount,
        price.currency,
        targetCurrency,
      ),
    }));
  }

  /**
   * Update exchange rates from API, with fallback to hardcoded rates
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async updateRates(): Promise<void> {
    try {
      const response = await fetch(
        'https://api.exchangerate-api.com/v4/latest/EUR',
      );

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = (await response.json()) as ExchangeRateApiResponse;

      this.exchangeRates = {
        base: Currency.EUR,
        rates: {
          [Currency.EUR]: 1,
          [Currency.USD]: data.rates.USD,
          [Currency.GBP]: data.rates.GBP,
        },
        lastUpdated: new Date(),
      };

      this.logger.log(
        `Exchange rates updated: USD=${data.rates.USD}, GBP=${data.rates.GBP}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to fetch exchange rates, using fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.exchangeRates.lastUpdated = new Date();
    }
  }
}
