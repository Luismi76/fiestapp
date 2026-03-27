// Constantes del modelo de negocio - deben coincidir con backend/src/wallet/wallet.service.ts
export const PLATFORM_FEE = 1.5;
export const MIN_TOPUP = 4.5;
export const VAT_RATE = 0.21;

// Helpers de cálculo de IVA
export const vatAmount = (amount: number) => Math.round(amount * VAT_RATE * 100) / 100;
export const withVat = (amount: number) => Math.round(amount * (1 + VAT_RATE) * 100) / 100;
