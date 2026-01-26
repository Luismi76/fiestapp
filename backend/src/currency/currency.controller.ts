import { Controller, Get, Query } from '@nestjs/common';
import { CurrencyService, Currency } from './currency.service';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * Get all available currencies
   */
  @Get()
  getAvailableCurrencies() {
    return {
      currencies: this.currencyService.getAvailableCurrencies(),
    };
  }

  /**
   * Get current exchange rates
   */
  @Get('rates')
  getExchangeRates() {
    return this.currencyService.getRates();
  }

  /**
   * Convert amount between currencies
   */
  @Get('convert')
  convert(
    @Query('amount') amount: string,
    @Query('from') from: Currency,
    @Query('to') to: Currency,
  ) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return { error: 'Invalid amount' };
    }

    const converted = this.currencyService.convert(numAmount, from, to);
    const rate = this.currencyService.getRate(from, to);

    return {
      original: {
        amount: numAmount,
        currency: from,
        formatted: this.currencyService.format(numAmount, from),
      },
      converted: {
        amount: converted,
        currency: to,
        formatted: this.currencyService.format(converted, to),
      },
      rate,
    };
  }
}
