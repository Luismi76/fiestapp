import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GroupPriceResult {
  pricePerPerson: number;
  totalPrice: number;
  discount: number; // Porcentaje de descuento aplicado
  tier: 'individual' | 'small_group' | 'large_group';
  originalPricePerPerson: number;
  savings: number;
}

export interface GroupPricingTier {
  minPeople: number;
  maxPeople: number | null;
  pricePerPerson: number;
}

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async calculateGroupPrice(
    experienceId: string,
    participants: number,
  ): Promise<GroupPriceResult> {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      include: {
        groupPricing: {
          orderBy: { minPeople: 'asc' },
        },
      },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    // Validar número de participantes
    if (participants < (experience.minParticipants || 1)) {
      throw new Error(
        `El mínimo de participantes es ${experience.minParticipants || 1}`,
      );
    }

    const maxParticipants = experience.maxParticipants || experience.capacity;
    if (participants > maxParticipants) {
      throw new Error(`El máximo de participantes es ${maxParticipants}`);
    }

    const basePrice = experience.price ?? 0;
    let pricePerPerson = basePrice;
    let tier: 'individual' | 'small_group' | 'large_group' = 'individual';

    // Buscar el tier de precio aplicable
    if (experience.groupPricing && experience.groupPricing.length > 0) {
      for (const pricing of experience.groupPricing) {
        const minPeople = pricing.minPeople;
        const maxPeople = pricing.maxPeople;

        if (
          participants >= minPeople &&
          (maxPeople === null || participants <= maxPeople)
        ) {
          pricePerPerson = pricing.pricePerPerson;

          // Determinar el tier basado en el rango
          if (minPeople <= 2) {
            tier = 'individual';
          } else if (minPeople <= 5) {
            tier = 'small_group';
          } else {
            tier = 'large_group';
          }
          break;
        }
      }
    }

    const totalPrice = pricePerPerson * participants;
    const originalTotal = basePrice * participants;
    const savings = originalTotal - totalPrice;
    const discount =
      basePrice > 0 ? Math.round(((basePrice - pricePerPerson) / basePrice) * 100) : 0;

    return {
      pricePerPerson,
      totalPrice,
      discount,
      tier,
      originalPricePerPerson: basePrice,
      savings,
    };
  }

  async setGroupPricing(
    experienceId: string,
    userId: string,
    tiers: GroupPricingTier[],
  ): Promise<void> {
    // Verificar que la experiencia pertenece al usuario
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    if (experience.hostId !== userId) {
      throw new Error('No tienes permiso para modificar esta experiencia');
    }

    // Validar tiers
    this.validatePricingTiers(tiers);

    // Eliminar pricing existente y crear nuevos
    await this.prisma.$transaction(async (tx) => {
      await tx.groupPricing.deleteMany({
        where: { experienceId },
      });

      if (tiers.length > 0) {
        await tx.groupPricing.createMany({
          data: tiers.map((tier) => ({
            experienceId,
            minPeople: tier.minPeople,
            maxPeople: tier.maxPeople,
            pricePerPerson: tier.pricePerPerson,
          })),
        });
      }
    });
  }

  async getGroupPricing(experienceId: string): Promise<GroupPricingTier[]> {
    const pricing = await this.prisma.groupPricing.findMany({
      where: { experienceId },
      orderBy: { minPeople: 'asc' },
      select: {
        minPeople: true,
        maxPeople: true,
        pricePerPerson: true,
      },
    });

    return pricing;
  }

  private validatePricingTiers(tiers: GroupPricingTier[]): void {
    if (tiers.length === 0) return;

    // Ordenar por minPeople
    const sortedTiers = [...tiers].sort((a, b) => a.minPeople - b.minPeople);

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];

      // Validar valores positivos
      if (tier.minPeople < 1) {
        throw new Error('El mínimo de personas debe ser al menos 1');
      }

      if (tier.pricePerPerson < 0) {
        throw new Error('El precio por persona no puede ser negativo');
      }

      if (tier.maxPeople !== null && tier.maxPeople < tier.minPeople) {
        throw new Error(
          'El máximo de personas debe ser mayor o igual al mínimo',
        );
      }

      // Verificar que no haya solapamiento con el siguiente tier
      if (i < sortedTiers.length - 1) {
        const nextTier = sortedTiers[i + 1];
        const currentMax = tier.maxPeople ?? Infinity;

        if (currentMax >= nextTier.minPeople) {
          throw new Error(
            `Los rangos de precios no pueden solaparse: ${tier.minPeople}-${tier.maxPeople || '∞'} y ${nextTier.minPeople}-${nextTier.maxPeople || '∞'}`,
          );
        }
      }
    }
  }

  async updateExperienceParticipantLimits(
    experienceId: string,
    userId: string,
    minParticipants: number,
    maxParticipants: number | null,
  ): Promise<void> {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    if (experience.hostId !== userId) {
      throw new Error('No tienes permiso para modificar esta experiencia');
    }

    // Validaciones
    if (minParticipants < 1) {
      throw new Error('El mínimo de participantes debe ser al menos 1');
    }

    if (maxParticipants !== null) {
      if (maxParticipants < minParticipants) {
        throw new Error(
          'El máximo de participantes debe ser mayor o igual al mínimo',
        );
      }

      if (maxParticipants > experience.capacity) {
        throw new Error(
          `El máximo de participantes no puede superar la capacidad (${experience.capacity})`,
        );
      }
    }

    await this.prisma.experience.update({
      where: { id: experienceId },
      data: {
        minParticipants,
        maxParticipants,
      },
    });
  }
}
