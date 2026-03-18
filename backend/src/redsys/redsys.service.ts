import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRedsysAPI,
  SANDBOX_URLS,
  PRODUCTION_URLS,
  randomTransactionId,
  TRANSACTION_TYPES,
} from 'redsys-easy';

@Injectable()
export class RedsysService {
  private readonly logger = new Logger(RedsysService.name);
  private redsysAPI: ReturnType<typeof createRedsysAPI>;
  private merchantCode: string;
  private terminal: string;

  constructor(private configService: ConfigService) {
    const secretKey =
      this.configService.get<string>('REDSYS_SECRET_KEY') ||
      'sq7HjrUOBfKmC576ILgskD5srU870gJ7';
    const sandbox =
      this.configService.get<string>('REDSYS_SANDBOX') !== 'false';

    this.merchantCode =
      this.configService.get<string>('REDSYS_MERCHANT_CODE') || '999008881';
    this.terminal =
      this.configService.get<string>('REDSYS_TERMINAL') || '1';

    this.redsysAPI = createRedsysAPI({
      secretKey,
      urls: sandbox ? SANDBOX_URLS : PRODUCTION_URLS,
    });

    this.logger.log(
      `Redsys initialized - merchant: ${this.merchantCode}, terminal: ${this.terminal}, sandbox: ${sandbox}`,
    );
  }

  generateOrderId(): string {
    return randomTransactionId();
  }

  createPaymentForm(params: {
    orderId: string;
    amount: number;
    description: string;
    merchantData?: string;
    successUrl: string;
    errorUrl: string;
    notificationUrl: string;
  }) {
    const amountInCents = Math.round(params.amount * 100).toString();

    const form = this.redsysAPI.createRedirectForm({
      DS_MERCHANT_MERCHANTCODE: this.merchantCode,
      DS_MERCHANT_TERMINAL: this.terminal,
      DS_MERCHANT_ORDER: params.orderId,
      DS_MERCHANT_TRANSACTIONTYPE: TRANSACTION_TYPES.AUTHORIZATION,
      DS_MERCHANT_AMOUNT: amountInCents,
      DS_MERCHANT_CURRENCY: '978', // EUR
      DS_MERCHANT_MERCHANTNAME: 'FiestApp',
      DS_MERCHANT_PRODUCTDESCRIPTION: params.description,
      DS_MERCHANT_MERCHANTDATA: params.merchantData || '',
      DS_MERCHANT_URLOK: params.successUrl,
      DS_MERCHANT_URLKO: params.errorUrl,
      DS_MERCHANT_MERCHANTURL: params.notificationUrl,
      DS_MERCHANT_CONSUMERLANGUAGE: '1', // Español
    });

    this.logger.debug(`Payment form created for order ${params.orderId}, amount: ${params.amount}€`);

    return form;
  }

  processNotification(body: {
    Ds_SignatureVersion: string;
    Ds_MerchantParameters: string;
    Ds_Signature: string;
  }) {
    // processRestNotification verifica la firma HMAC y decodifica los parámetros
    return this.redsysAPI.processRestNotification(body);
  }

  /**
   * Devolución server-to-server (Redsys Tipo 3)
   * Usa REST API directamente, no requiere interacción del usuario
   */
  async createRefund(params: {
    originalOrderId: string;
    amount: number;
  }): Promise<{ success: boolean; responseCode?: string }> {
    const amountInCents = Math.round(params.amount * 100).toString();

    try {
      const result = await this.redsysAPI.restTrataPeticion({
        DS_MERCHANT_MERCHANTCODE: this.merchantCode,
        DS_MERCHANT_TERMINAL: this.terminal,
        DS_MERCHANT_ORDER: params.originalOrderId,
        DS_MERCHANT_TRANSACTIONTYPE: TRANSACTION_TYPES.AUTO_REFUND,
        DS_MERCHANT_AMOUNT: amountInCents,
        DS_MERCHANT_CURRENCY: '978',
      });

      const responseCode = result?.Ds_Response || '';
      const success = this.isSuccessResponse(responseCode);

      this.logger.log(
        `Refund ${success ? 'OK' : 'FAILED'}: order=${params.originalOrderId}, amount=${params.amount}€, response=${responseCode}`,
      );

      return { success, responseCode };
    } catch (error) {
      this.logger.error(
        `Refund error: order=${params.originalOrderId}`,
        error,
      );
      return { success: false };
    }
  }

  /**
   * Comprueba si el código de respuesta indica éxito (0000-0099)
   */
  isSuccessResponse(responseCode: string): boolean {
    const code = parseInt(responseCode, 10);
    return !isNaN(code) && code >= 0 && code <= 99;
  }
}
