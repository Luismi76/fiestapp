import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Claves de configuración disponibles */
export enum ConfigKey {
  PLATFORM_FEE = 'platform_fee',
  MIN_TOPUP = 'min_topup',
  VAT_RATE = 'vat_rate',
  STRIPE_FEE_RATE = 'stripe_fee_rate',
  STRIPE_FEE_FIXED = 'stripe_fee_fixed',
}

/** Valores por defecto */
const DEFAULTS: Record<ConfigKey, { value: string; description: string }> = {
  [ConfigKey.PLATFORM_FEE]: {
    value: '1.5',
    description: 'Comisión de plataforma por operación (en euros). El IVA se recauda en la recarga del monedero.',
  },
  [ConfigKey.MIN_TOPUP]: {
    value: '4.5',
    description: 'Recarga mínima del monedero (en euros)',
  },
  [ConfigKey.VAT_RATE]: {
    value: '0.21',
    description: 'Tipo de IVA aplicado a las recargas (0.21 = 21%)',
  },
  [ConfigKey.STRIPE_FEE_RATE]: {
    value: '0.015',
    description: 'Comisión porcentual de Stripe por transacción (0.015 = 1,5%)',
  },
  [ConfigKey.STRIPE_FEE_FIXED]: {
    value: '0.25',
    description: 'Comisión fija de Stripe por transacción (en euros)',
  },
};

@Injectable()
export class PlatformConfigService implements OnModuleInit {
  private readonly logger = new Logger(PlatformConfigService.name);
  private cache = new Map<string, string>();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureTable();
      await this.seedDefaults();
      await this.loadAll();
    } catch (error) {
      this.logger.warn(
        `No se pudo cargar PlatformConfig desde BD, usando valores por defecto: ${error instanceof Error ? error.message : error}`,
      );
      // Cargar defaults en cache para que el servicio funcione sin BD
      for (const [key, { value }] of Object.entries(DEFAULTS)) {
        this.cache.set(key, value);
      }
    }
  }

  /**
   * Crea la tabla si no existe (para entornos donde no se ejecutó la migración)
   */
  private async ensureTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS platform_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Inserta valores por defecto si no existen
   */
  private async seedDefaults() {
    for (const [key, { value, description }] of Object.entries(DEFAULTS)) {
      await this.prisma.platformConfig.upsert({
        where: { key },
        create: { key, value, description },
        update: {}, // no sobreescribir si ya existe
      });
    }
  }

  /**
   * Carga todos los valores en cache
   */
  private async loadAll() {
    const configs = await this.prisma.platformConfig.findMany();
    this.cache.clear();
    for (const config of configs) {
      this.cache.set(config.key, config.value);
    }
    this.logger.log(
      `Configuración cargada: ${configs.map((c) => `${c.key}=${c.value}`).join(', ')}`,
    );
  }

  /**
   * Obtiene un valor numérico de configuración
   */
  getNumber(key: ConfigKey): number {
    const val = this.cache.get(key);
    if (val === undefined) {
      return parseFloat(DEFAULTS[key].value);
    }
    return parseFloat(val);
  }

  /**
   * Comisión de plataforma (€)
   */
  get platformFee(): number {
    return this.getNumber(ConfigKey.PLATFORM_FEE);
  }

  /**
   * Recarga mínima (€)
   */
  get minTopup(): number {
    return this.getNumber(ConfigKey.MIN_TOPUP);
  }

  /**
   * Tipo de IVA (decimal, ej: 0.21)
   */
  get vatRate(): number {
    return this.getNumber(ConfigKey.VAT_RATE);
  }

  /**
   * Calcula la comisión de Stripe para un importe dado.
   * Fórmula: importe * tasa_porcentual + comisión_fija
   */
  calculateStripeFee(amount: number): number {
    const rate = this.getNumber(ConfigKey.STRIPE_FEE_RATE);
    const fixed = this.getNumber(ConfigKey.STRIPE_FEE_FIXED);
    return Math.round((amount * rate + fixed) * 100) / 100;
  }

  /**
   * Obtiene toda la configuración
   */
  async getAll(): Promise<
    { key: string; value: string; description: string | null; updatedAt: Date }[]
  > {
    return this.prisma.platformConfig.findMany({
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Actualiza un valor y refresca la cache
   */
  async update(
    key: string,
    value: string,
  ): Promise<{ key: string; value: string }> {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      throw new Error(`Valor inválido para ${key}: debe ser un número >= 0`);
    }

    const updated = await this.prisma.platformConfig.update({
      where: { key },
      data: { value },
    });

    this.cache.set(key, value);
    this.logger.log(`Configuración actualizada: ${key} = ${value}`);

    return { key: updated.key, value: updated.value };
  }

  /**
   * Actualiza varios valores a la vez
   */
  async updateMany(
    entries: { key: string; value: string }[],
  ): Promise<{ key: string; value: string }[]> {
    const results: { key: string; value: string }[] = [];
    for (const entry of entries) {
      results.push(await this.update(entry.key, entry.value));
    }
    return results;
  }
}
