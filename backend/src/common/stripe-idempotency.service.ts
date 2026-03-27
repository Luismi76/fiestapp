import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeIdempotencyService {
  private readonly logger = new Logger(StripeIdempotencyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Verifica si un evento de Stripe ya fue procesado.
   * Si no, lo marca como procesado y devuelve false (= procesar).
   * Si ya existe, devuelve true (= ignorar).
   */
  async isAlreadyProcessed(
    eventId: string,
    eventType: string,
  ): Promise<boolean> {
    try {
      const existing = await this.prisma.stripeEvent.findUnique({
        where: { eventId },
      });

      if (existing) {
        this.logger.debug(
          `Stripe event ${eventId} already processed, skipping`,
        );
        return true;
      }

      await this.prisma.stripeEvent.create({
        data: { eventId, type: eventType },
      });

      return false;
    } catch (error) {
      // Si falla por unique constraint (procesamiento concurrente), ignorar
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        this.logger.debug(
          `Stripe event ${eventId} concurrent duplicate, skipping`,
        );
        return true;
      }
      this.logger.error(`Error checking Stripe event idempotency: ${error}`);
      // En caso de error de BD, dejar pasar (los handlers tienen sus propios checks)
      return false;
    }
  }
}
