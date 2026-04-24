import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

/** Claves de configuración disponibles */
export enum ConfigKey {
  PLATFORM_FEE = 'platform_fee',
  VAT_RATE = 'vat_rate',
  STRIPE_FEE_RATE = 'stripe_fee_rate',
  STRIPE_FEE_FIXED = 'stripe_fee_fixed',
  STRIPE_PRICE_BASICO = 'stripe_price_basico',
  STRIPE_PRICE_AVENTURA = 'stripe_price_aventura',
  STRIPE_PRICE_VIAJERO = 'stripe_price_viajero',
  // Datos fiscales del emisor (aparecen en las facturas).
  // Placeholders hasta que el admin los rellene desde el panel.
  ISSUER_NAME = 'issuer_name',
  ISSUER_TAX_ID = 'issuer_tax_id',
  ISSUER_ADDRESS = 'issuer_address',
  ISSUER_POSTAL_CODE = 'issuer_postal_code',
  ISSUER_CITY = 'issuer_city',
  ISSUER_COUNTRY = 'issuer_country',
}

/** Claves cuyo valor es texto libre (no numérico) */
const TEXT_KEYS: ReadonlySet<string> = new Set([
  ConfigKey.ISSUER_NAME,
  ConfigKey.ISSUER_TAX_ID,
  ConfigKey.ISSUER_ADDRESS,
  ConfigKey.ISSUER_POSTAL_CODE,
  ConfigKey.ISSUER_CITY,
  ConfigKey.ISSUER_COUNTRY,
  ConfigKey.STRIPE_PRICE_BASICO,
  ConfigKey.STRIPE_PRICE_AVENTURA,
  ConfigKey.STRIPE_PRICE_VIAJERO,
]);

/** Valores por defecto */
const DEFAULTS: Record<string, { value: string; description: string }> = {
  [ConfigKey.PLATFORM_FEE]: {
    value: '1.5',
    description:
      'Comisión de plataforma por operación (en euros). Se aplica al comprar un pack de experiencias.',
  },
  [ConfigKey.VAT_RATE]: {
    value: '0.21',
    description: 'Tipo de IVA aplicado a las comisiones (0.21 = 21%)',
  },
  [ConfigKey.STRIPE_FEE_RATE]: {
    value: '0.015',
    description: 'Comisión porcentual de Stripe por transacción (0.015 = 1,5%)',
  },
  [ConfigKey.STRIPE_FEE_FIXED]: {
    value: '0.25',
    description: 'Comisión fija de Stripe por transacción (en euros)',
  },
  [ConfigKey.STRIPE_PRICE_BASICO]: {
    value: 'price_1TL5PQJnOJ3BwACb5ppv1jbp',
    description: 'Stripe Price ID para Pack Básico (2 experiencias)',
  },
  [ConfigKey.STRIPE_PRICE_AVENTURA]: {
    value: 'price_1TL5PQJnOJ3BwACbzKN3dkNJ',
    description: 'Stripe Price ID para Pack Aventura (5+1 experiencias)',
  },
  [ConfigKey.STRIPE_PRICE_VIAJERO]: {
    value: 'price_1TL5PRJnOJ3BwACbwUWPSbAL',
    description: 'Stripe Price ID para Pack Viajero (13+3 experiencias)',
  },
  [ConfigKey.ISSUER_NAME]: {
    value: 'FiestApp (placeholder — editar desde el panel)',
    description: 'Razón social / nombre fiscal del emisor en las facturas',
  },
  [ConfigKey.ISSUER_TAX_ID]: {
    value: 'PENDIENTE',
    description: 'NIF / CIF del emisor',
  },
  [ConfigKey.ISSUER_ADDRESS]: {
    value: 'Dirección pendiente de configurar',
    description: 'Domicilio fiscal del emisor (calle y número)',
  },
  [ConfigKey.ISSUER_POSTAL_CODE]: {
    value: '00000',
    description: 'Código postal del emisor',
  },
  [ConfigKey.ISSUER_CITY]: {
    value: 'Ciudad pendiente',
    description: 'Población del emisor',
  },
  [ConfigKey.ISSUER_COUNTRY]: {
    value: 'ES',
    description: 'País del emisor (ISO-3166-1 alpha-2)',
  },
};

@Injectable()
export class PlatformConfigService implements OnModuleInit {
  private readonly logger = new Logger(PlatformConfigService.name);
  private cache = new Map<string, string>();
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
  }

  async onModuleInit() {
    try {
      await this.ensureTable();
      await this.cleanupLegacyKeys();
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
   * Limpia claves legacy que ya no se usan en el sistema actual
   */
  private async cleanupLegacyKeys() {
    const legacyKeys = ['min_topup'];
    try {
      const result = await this.prisma.platformConfig.deleteMany({
        where: { key: { in: legacyKeys } },
      });
      if (result.count > 0) {
        this.logger.log(
          `Cleaned up ${result.count} legacy config keys: ${legacyKeys.join(', ')}`,
        );
      }
    } catch {
      // No crítico
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
   * Obtiene un valor de texto de configuración
   */
  getString(key: ConfigKey): string {
    const val = this.cache.get(key);
    if (val === undefined) {
      return DEFAULTS[key].value;
    }
    return val;
  }

  /**
   * Datos fiscales del emisor que aparecen en cada factura (snapshot).
   */
  getIssuerData(): {
    name: string;
    taxId: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
  } {
    return {
      name: this.getString(ConfigKey.ISSUER_NAME),
      taxId: this.getString(ConfigKey.ISSUER_TAX_ID),
      address: this.getString(ConfigKey.ISSUER_ADDRESS),
      postalCode: this.getString(ConfigKey.ISSUER_POSTAL_CODE),
      city: this.getString(ConfigKey.ISSUER_CITY),
      country: this.getString(ConfigKey.ISSUER_COUNTRY),
    };
  }

  /**
   * Comisión de plataforma (€)
   */
  get platformFee(): number {
    return this.getNumber(ConfigKey.PLATFORM_FEE);
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
   * Obtiene el Stripe Price ID para un pack
   */
  getStripePriceId(packId: string): string | null {
    const keyMap: Record<string, ConfigKey> = {
      basico: ConfigKey.STRIPE_PRICE_BASICO,
      aventura: ConfigKey.STRIPE_PRICE_AVENTURA,
      viajero: ConfigKey.STRIPE_PRICE_VIAJERO,
    };
    const key = keyMap[packId];
    if (!key) return null;
    const val = this.cache.get(key);
    return val && val.startsWith('price_') ? val : null;
  }

  /**
   * Definiciones de packs de experiencias (calculados a partir de la comisión)
   */
  getPacks(): {
    id: string;
    name: string;
    price: number;
    experiences: number;
    bonus: number;
  }[] {
    const fee = this.platformFee;
    return [
      {
        id: 'basico',
        name: 'Básico',
        price: Math.round(2 * fee * 100) / 100,
        experiences: 2,
        bonus: 0,
      },
      {
        id: 'aventura',
        name: 'Aventura',
        price: Math.round(4 * fee * 100) / 100,
        experiences: 5,
        bonus: 1,
      },
      {
        id: 'viajero',
        name: 'Viajero',
        price: Math.round(8 * fee * 100) / 100,
        experiences: 13,
        bonus: 3,
      },
    ];
  }

  /**
   * Obtiene un pack por ID
   */
  getPack(packId: string) {
    return this.getPacks().find((p) => p.id === packId) || null;
  }

  /**
   * Claves que el admin puede editar desde el panel.
   * El resto (stripe_fee_*, stripe_price_*) son internas/automáticas
   * y no deberían poder modificarse manualmente.
   */
  private static readonly EDITABLE_KEYS: string[] = [
    ConfigKey.PLATFORM_FEE,
    ConfigKey.VAT_RATE,
    ConfigKey.ISSUER_NAME,
    ConfigKey.ISSUER_TAX_ID,
    ConfigKey.ISSUER_ADDRESS,
    ConfigKey.ISSUER_POSTAL_CODE,
    ConfigKey.ISSUER_CITY,
    ConfigKey.ISSUER_COUNTRY,
  ];

  /**
   * Obtiene la configuración visible en el panel de admin
   * (solo claves editables).
   */
  async getAll(): Promise<
    {
      key: string;
      value: string;
      description: string | null;
      updatedAt: Date;
    }[]
  > {
    return this.prisma.platformConfig.findMany({
      where: { key: { in: PlatformConfigService.EDITABLE_KEYS } },
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
    // Solo se permiten editar las claves marcadas como editables.
    // El resto (stripe_fee_*, stripe_price_*) son internas/automáticas.
    if (!PlatformConfigService.EDITABLE_KEYS.includes(key)) {
      throw new Error(
        `La clave ${key} no se puede editar manualmente desde el panel.`,
      );
    }

    if (TEXT_KEYS.has(key)) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Valor inválido para ${key}: debe ser una cadena no vacía`);
      }
    } else {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        throw new Error(`Valor inválido para ${key}: debe ser un número >= 0`);
      }
    }

    const updated = await this.prisma.platformConfig.update({
      where: { key },
      data: { value },
    });

    this.cache.set(key, value);
    this.logger.log(`Configuración actualizada: ${key} = ${value}`);

    // Si cambia la comisión de plataforma, sincronizar Stripe Prices
    if (key === (ConfigKey.PLATFORM_FEE as string)) {
      const newFee = parseFloat(value);
      if (!isNaN(newFee) && newFee > 0) {
        await this.syncStripePricesForFee(newFee);
      }
    }

    return { key: updated.key, value: updated.value };
  }

  /**
   * Crea nuevos Stripe Prices con los importes recalculados al cambiar la
   * comisión de plataforma. Mantiene los mismos Products de Stripe.
   * Archiva los Prices antiguos.
   */
  private async syncStripePricesForFee(newFee: number): Promise<void> {
    if (!this.stripe) {
      this.logger.warn(
        'Stripe no configurado, no se pueden sincronizar los precios de los packs',
      );
      return;
    }

    const packMultipliers: Array<{
      configKey: ConfigKey;
      label: string;
      multiplier: number;
    }> = [
      {
        configKey: ConfigKey.STRIPE_PRICE_BASICO,
        label: 'Básico',
        multiplier: 2,
      },
      {
        configKey: ConfigKey.STRIPE_PRICE_AVENTURA,
        label: 'Aventura',
        multiplier: 4,
      },
      {
        configKey: ConfigKey.STRIPE_PRICE_VIAJERO,
        label: 'Viajero',
        multiplier: 8,
      },
    ];

    for (const pack of packMultipliers) {
      const oldPriceId = this.cache.get(pack.configKey);
      if (!oldPriceId || !oldPriceId.startsWith('price_')) {
        this.logger.warn(
          `Pack ${pack.label}: no hay Price ID válido en config, se omite el sync`,
        );
        continue;
      }

      try {
        // Obtener el producto asociado al Price antiguo
        const oldPrice = await this.stripe.prices.retrieve(oldPriceId);
        const productId =
          typeof oldPrice.product === 'string'
            ? oldPrice.product
            : oldPrice.product?.id;

        if (!productId) {
          this.logger.error(
            `Pack ${pack.label}: no se pudo obtener el Product ID del Price ${oldPriceId}`,
          );
          continue;
        }

        // Calcular nuevo importe
        const newAmountEur = Math.round(pack.multiplier * newFee * 100) / 100;
        const newAmountCents = Math.round(newAmountEur * 100);

        // Crear nuevo Price bajo el mismo Product
        const newPrice = await this.stripe.prices.create({
          product: productId,
          unit_amount: newAmountCents,
          currency: 'eur',
        });

        // Guardar el nuevo Price ID en config (sin recursión: no es PLATFORM_FEE)
        await this.prisma.platformConfig.update({
          where: { key: pack.configKey },
          data: { value: newPrice.id },
        });
        this.cache.set(pack.configKey, newPrice.id);

        // Archivar el Price antiguo (no se puede borrar pero sí desactivar)
        try {
          await this.stripe.prices.update(oldPriceId, { active: false });
        } catch {
          // No crítico
        }

        this.logger.log(
          `Pack ${pack.label}: Stripe Price actualizado ${oldPriceId} → ${newPrice.id} (${newAmountEur}€)`,
        );
      } catch (err) {
        this.logger.error(
          `Pack ${pack.label}: error al sincronizar Stripe Price: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
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
