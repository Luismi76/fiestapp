import { Injectable } from '@nestjs/common';
import { TaxRegime } from '@prisma/client';

export type FiscalRegion =
  | 'peninsula'
  | 'canarias'
  | 'ceuta'
  | 'melilla';

export const FISCAL_REGIONS: FiscalRegion[] = [
  'peninsula',
  'canarias',
  'ceuta',
  'melilla',
];

export interface TaxResolution {
  regime: TaxRegime;
  rate: number; // decimal (0.21, 0.07...)
  label: string; // "IVA 21%", "IGIC 7%"
}

export interface TaxAmounts {
  net: number;
  tax: number;
  gross: number;
}

/**
 * Resuelve el régimen fiscal aplicable a una operación y calcula base/cuota/total.
 * La fuente de verdad para qué régimen aplicar es la residencia del comprador:
 *   - ES + península/baleares  → IVA 21%
 *   - ES + canarias            → IGIC 7%
 *   - ES + ceuta               → IPSI 4%
 *   - ES + melilla             → IPSI 4%
 *   - UE (otro país)           → exento (inversión sujeto pasivo — simplificación)
 *   - resto                    → exento (exportación)
 */
@Injectable()
export class TaxService {
  resolveRegime(input: {
    country?: string | null;
    region?: string | null;
  }): TaxResolution {
    const country = (input.country || '').toUpperCase();
    const region = (input.region || '').toLowerCase();

    if (country === 'ES') {
      if (region === 'canarias') {
        return { regime: TaxRegime.IGIC_CANARIAS_7, rate: 0.07, label: 'IGIC 7%' };
      }
      if (region === 'ceuta') {
        return { regime: TaxRegime.IPSI_CEUTA_4, rate: 0.04, label: 'IPSI 4%' };
      }
      if (region === 'melilla') {
        return { regime: TaxRegime.IPSI_MELILLA_4, rate: 0.04, label: 'IPSI 4%' };
      }
      // peninsula | baleares | desconocido → IVA general
      return { regime: TaxRegime.IVA_GENERAL_21, rate: 0.21, label: 'IVA 21%' };
    }

    // Países UE (distintos de ES): operación exenta por inversión del sujeto pasivo
    if (this.isEuCountry(country)) {
      return { regime: TaxRegime.EXENTO_UE, rate: 0, label: 'Exento (UE)' };
    }

    // Resto del mundo
    return { regime: TaxRegime.EXENTO_EXTRA_UE, rate: 0, label: 'Exento (exportación)' };
  }

  /**
   * A partir de un importe bruto (IVA incluido si aplica) devuelve base/cuota/total
   * coherentes con el tipo. Si rate=0 no hay impuesto repercutido.
   */
  computeAmounts(grossAmount: number, rate: number): TaxAmounts {
    if (!isFinite(grossAmount) || grossAmount < 0) {
      throw new Error('grossAmount debe ser un número no negativo');
    }
    if (!isFinite(rate) || rate < 0 || rate >= 1) {
      throw new Error('rate debe estar en [0, 1)');
    }

    const gross = this.round2(grossAmount);
    if (rate === 0) {
      return { net: gross, tax: 0, gross };
    }

    const net = this.round2(gross / (1 + rate));
    const tax = this.round2(gross - net);
    return { net, tax, gross };
  }

  /**
   * Determina el periodo fiscal (año/trimestre) al que pertenece una fecha.
   */
  fiscalPeriodOf(date: Date): { year: number; quarter: 1 | 2 | 3 | 4; label: string } {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-11
    const quarter = (Math.floor(month / 3) + 1) as 1 | 2 | 3 | 4;
    return { year, quarter, label: `${year}-Q${quarter}` };
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private isEuCountry(code: string): boolean {
    return EU_COUNTRY_CODES.has(code);
  }
}

const EU_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);
