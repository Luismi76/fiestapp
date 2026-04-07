// Valores por defecto (fallback) - los valores reales se obtienen del endpoint /wallet
export const PLATFORM_FEE = 1.5;
export const MIN_TOPUP = 4.5;
export const VAT_RATE = 0.21;

// Helpers de cálculo de IVA (para comisiones de plataforma, que incluyen IVA)
export const vatAmount = (amount: number) => Math.round(amount * VAT_RATE * 100) / 100;
export const withVat = (amount: number) => Math.round(amount * (1 + VAT_RATE) * 100) / 100;
