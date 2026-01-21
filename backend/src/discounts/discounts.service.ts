import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';

export interface ValidateDiscountResult {
  valid: boolean;
  discountId?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  discountAmount?: number;
  message?: string;
}

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo codigo de descuento (admin)
   */
  async createDiscount(data: CreateDiscountDto) {
    const existing = await this.prisma.discountCode.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un codigo con ese nombre');
    }

    return this.prisma.discountCode.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minAmount: data.minAmount,
        maxUses: data.maxUses,
        maxUsesPerUser: data.maxUsesPerUser ?? 1,
        validFrom: data.validFrom ?? new Date(),
        expiresAt: data.expiresAt,
        description: data.description,
      },
    });
  }

  /**
   * Obtiene todos los codigos de descuento (admin)
   */
  async getAllDiscounts(page = 1, limit = 20, includeExpired = false) {
    const skip = (page - 1) * limit;
    const now = new Date();

    const where = includeExpired
      ? {}
      : {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        };

    const [discounts, total] = await Promise.all([
      this.prisma.discountCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { usages: true } },
        },
      }),
      this.prisma.discountCode.count({ where }),
    ]);

    return {
      discounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene un codigo de descuento por ID
   */
  async getDiscountById(id: string) {
    const discount = await this.prisma.discountCode.findUnique({
      where: { id },
      include: {
        usages: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { usedAt: 'desc' },
          take: 50,
        },
        _count: { select: { usages: true } },
      },
    });

    if (!discount) {
      throw new NotFoundException('Codigo de descuento no encontrado');
    }

    return discount;
  }

  /**
   * Valida un codigo de descuento para un usuario
   */
  async validateDiscount(
    code: string,
    userId: string,
    amount: number,
  ): Promise<ValidateDiscountResult> {
    const discount = await this.prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!discount) {
      return { valid: false, message: 'Codigo no valido' };
    }

    if (!discount.active) {
      return { valid: false, message: 'Este codigo ya no esta activo' };
    }

    const now = new Date();

    if (discount.validFrom && discount.validFrom > now) {
      return { valid: false, message: 'Este codigo aun no es valido' };
    }

    if (discount.expiresAt && discount.expiresAt < now) {
      return { valid: false, message: 'Este codigo ha expirado' };
    }

    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return { valid: false, message: 'Este codigo ha alcanzado su limite de usos' };
    }

    if (discount.minAmount && amount < discount.minAmount) {
      return {
        valid: false,
        message: `Monto minimo requerido: ${discount.minAmount}€`,
      };
    }

    // Verificar usos por usuario
    const userUsages = await this.prisma.discountUsage.count({
      where: {
        discountCodeId: discount.id,
        userId,
      },
    });

    if (userUsages >= discount.maxUsesPerUser) {
      return { valid: false, message: 'Ya has usado este codigo el maximo de veces permitido' };
    }

    // Calcular descuento
    let discountAmount: number;
    if (discount.type === 'percentage') {
      discountAmount = Math.round((amount * discount.value) / 100 * 100) / 100;
    } else {
      discountAmount = Math.min(discount.value, amount);
    }

    return {
      valid: true,
      discountId: discount.id,
      type: discount.type as 'percentage' | 'fixed',
      value: discount.value,
      discountAmount,
    };
  }

  /**
   * Aplica un codigo de descuento (registra el uso)
   */
  async applyDiscount(
    code: string,
    userId: string,
    amount: number,
    transactionId?: string,
  ): Promise<{ finalAmount: number; discountAmount: number }> {
    const validation = await this.validateDiscount(code, userId, amount);

    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    // Registrar uso
    await this.prisma.$transaction([
      this.prisma.discountUsage.create({
        data: {
          discountCodeId: validation.discountId!,
          userId,
          amount: validation.discountAmount!,
          transactionId,
        },
      }),
      this.prisma.discountCode.update({
        where: { id: validation.discountId },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return {
      finalAmount: amount - validation.discountAmount!,
      discountAmount: validation.discountAmount!,
    };
  }

  /**
   * Actualiza un codigo de descuento
   */
  async updateDiscount(id: string, data: Partial<CreateDiscountDto>) {
    const discount = await this.prisma.discountCode.findUnique({
      where: { id },
    });

    if (!discount) {
      throw new NotFoundException('Codigo de descuento no encontrado');
    }

    return this.prisma.discountCode.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.minAmount !== undefined && { minAmount: data.minAmount }),
        ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
        ...(data.maxUsesPerUser !== undefined && { maxUsesPerUser: data.maxUsesPerUser }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  /**
   * Activa/desactiva un codigo de descuento
   */
  async toggleDiscountActive(id: string) {
    const discount = await this.prisma.discountCode.findUnique({
      where: { id },
    });

    if (!discount) {
      throw new NotFoundException('Codigo de descuento no encontrado');
    }

    return this.prisma.discountCode.update({
      where: { id },
      data: { active: !discount.active },
    });
  }

  /**
   * Elimina un codigo de descuento
   */
  async deleteDiscount(id: string) {
    const discount = await this.prisma.discountCode.findUnique({
      where: { id },
    });

    if (!discount) {
      throw new NotFoundException('Codigo de descuento no encontrado');
    }

    return this.prisma.discountCode.delete({
      where: { id },
    });
  }
}
