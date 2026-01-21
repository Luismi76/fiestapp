import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { randomBytes } from 'crypto';

const REFERRAL_CREDIT = 5; // Credito en EUR al referidor cuando el referido completa primera experiencia

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Genera un codigo de referido unico para un usuario
   */
  async generateReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, name: true },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Si ya tiene codigo, devolverlo
    if (user.referralCode) {
      return user.referralCode;
    }

    // Generar codigo unico basado en nombre + random
    const baseName = user.name
      .split(' ')[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    const code = `${baseName}${randomPart}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    return code;
  }

  /**
   * Valida un codigo de referido y retorna el usuario referidor
   */
  async validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string; referrerName?: string }> {
    if (!code) {
      return { valid: false };
    }

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: { id: true, name: true, bannedAt: true },
    });

    if (!referrer || referrer.bannedAt) {
      return { valid: false };
    }

    return {
      valid: true,
      referrerId: referrer.id,
      referrerName: referrer.name,
    };
  }

  /**
   * Registra una referencia durante el registro de usuario
   */
  async registerReferral(newUserId: string, referralCode: string): Promise<boolean> {
    const validation = await this.validateReferralCode(referralCode);

    if (!validation.valid) {
      return false;
    }

    // Verificar que no se refiera a si mismo (por si acaso)
    if (validation.referrerId === newUserId) {
      return false;
    }

    await this.prisma.user.update({
      where: { id: newUserId },
      data: { referredById: validation.referrerId },
    });

    // Notificar al referidor
    await this.notificationsService.create({
      userId: validation.referrerId!,
      type: 'referral_signup',
      title: 'Nuevo usuario referido!',
      message: `Un nuevo usuario se ha registrado usando tu codigo de referido. Recibiras ${REFERRAL_CREDIT}€ de credito cuando complete su primera experiencia.`,
      data: { referredUserId: newUserId },
    });

    this.logger.log(`Referral registered: ${newUserId} referred by ${validation.referrerId}`);
    return true;
  }

  /**
   * Otorga credito al referidor cuando el referido completa su primera experiencia
   */
  async awardReferralCredit(referredUserId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: referredUserId },
      select: {
        referredById: true,
        _count: {
          select: {
            matchesAsRequester: { where: { status: 'completed' } },
          },
        },
      },
    });

    if (!user || !user.referredById) {
      return false;
    }

    // Solo dar credito en la primera experiencia completada
    if (user._count.matchesAsRequester !== 1) {
      return false;
    }

    // Verificar si ya se dio credito
    const referrer = await this.prisma.user.findUnique({
      where: { id: user.referredById },
      select: { id: true, referralCreditsEarned: true },
    });

    if (!referrer) {
      return false;
    }

    // Dar credito al referidor
    await this.prisma.$transaction([
      // Actualizar wallet del referidor
      this.prisma.wallet.update({
        where: { userId: referrer.id },
        data: { balance: { increment: REFERRAL_CREDIT } },
      }),
      // Registrar creditos ganados
      this.prisma.user.update({
        where: { id: referrer.id },
        data: { referralCreditsEarned: { increment: REFERRAL_CREDIT } },
      }),
      // Crear transaccion de registro
      this.prisma.transaction.create({
        data: {
          userId: referrer.id,
          type: 'referral_credit',
          amount: REFERRAL_CREDIT,
          status: 'completed',
          description: `Credito por referido (usuario ${referredUserId})`,
        },
      }),
    ]);

    // Notificar al referidor
    await this.notificationsService.create({
      userId: referrer.id,
      type: 'referral_credit',
      title: `Has ganado ${REFERRAL_CREDIT}€!`,
      message: `Tu referido ha completado su primera experiencia. Se han anadido ${REFERRAL_CREDIT}€ a tu wallet.`,
      data: { amount: REFERRAL_CREDIT, referredUserId },
    });

    this.logger.log(`Referral credit awarded: ${REFERRAL_CREDIT}€ to ${referrer.id} for ${referredUserId}`);
    return true;
  }

  /**
   * Obtiene estadisticas de referidos de un usuario
   */
  async getReferralStats(userId: string) {
    const [user, referrals, referralCredits] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          referralCode: true,
          referralCreditsEarned: true,
        },
      }),
      this.prisma.user.findMany({
        where: { referredById: userId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              matchesAsRequester: { where: { status: 'completed' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'referral_credit',
          status: 'completed',
        },
        _sum: { amount: true },
        _count: { amount: true },
      }),
    ]);

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Generar codigo si no existe
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = await this.generateReferralCode(userId);
    }

    const referralLink = `${process.env.FRONTEND_URL || 'https://fiestapp.es'}/register?ref=${referralCode}`;

    return {
      referralCode,
      referralLink,
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter((r) => r._count.matchesAsRequester > 0).length,
      pendingReferrals: referrals.filter((r) => r._count.matchesAsRequester === 0).length,
      totalCreditsEarned: referralCredits._sum.amount || 0,
      creditPerReferral: REFERRAL_CREDIT,
      referrals: referrals.map((r) => ({
        id: r.id,
        name: r.name,
        joinedAt: r.createdAt,
        hasCompleted: r._count.matchesAsRequester > 0,
      })),
    };
  }
}
