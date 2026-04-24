import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SeriesDefinition {
  code: string;
  description: string;
  active: boolean;
}

const SERIES_DEFINITIONS: SeriesDefinition[] = [
  { code: 'A', description: 'Packs de experiencias (viajeros)', active: true },
  { code: 'RA', description: 'Rectificativas serie A', active: true },
  { code: 'C', description: 'Comisiones a anfitriones (inactiva)', active: false },
];

/**
 * Asegura que existen los contadores de series para el año actual y el siguiente.
 * Se ejecuta al arrancar el módulo. Idempotente: no sobrescribe contadores existentes.
 */
@Injectable()
export class InvoiceSeriesSeeder implements OnModuleInit {
  private readonly logger = new Logger(InvoiceSeriesSeeder.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const now = new Date();
    const years = [now.getFullYear(), now.getFullYear() + 1];

    for (const year of years) {
      for (const def of SERIES_DEFINITIONS) {
        try {
          await this.prisma.invoiceSeries.upsert({
            where: { code_year: { code: def.code, year } },
            create: {
              code: def.code,
              year,
              nextNumber: 1,
              description: def.description,
              active: def.active,
            },
            update: {}, // nunca sobrescribir un contador existente
          });
        } catch (error) {
          this.logger.warn(
            `No se pudo sembrar la serie ${def.code}-${year}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    }
  }
}
