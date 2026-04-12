import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * IDs canónicos de los tours disponibles.
 * Si añades un nuevo tour, regístralo aquí para que aparezca en stats.
 */
export const TOUR_IDS = ['welcome', 'booking', 'host', 'payment'] as const;
export type TourId = (typeof TOUR_IDS)[number];

@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompleted(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { toursCompleted: true },
    });
    return user?.toursCompleted ?? [];
  }

  async markCompleted(userId: string, tourId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { toursCompleted: true },
    });
    const current = user?.toursCompleted ?? [];
    if (current.includes(tourId)) {
      return current;
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { toursCompleted: { set: [...current, tourId] } },
      select: { toursCompleted: true },
    });
    return updated.toursCompleted;
  }

  async reset(userId: string, tourId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { toursCompleted: true },
    });
    const current = user?.toursCompleted ?? [];
    const filtered = current.filter((id) => id !== tourId);
    if (filtered.length === current.length) {
      return current;
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { toursCompleted: { set: filtered } },
      select: { toursCompleted: true },
    });
    return updated.toursCompleted;
  }

  async resetAll(userId: string): Promise<string[]> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { toursCompleted: { set: [] } },
      select: { toursCompleted: true },
    });
    return updated.toursCompleted;
  }

  /**
   * Estadísticas para el panel de admin: por cada tour conocido,
   * cuántos usuarios lo han completado y porcentaje sobre total.
   */
  async getStats(): Promise<{
    totalUsers: number;
    tours: { tourId: string; completedCount: number; percentage: number }[];
  }> {
    const totalUsers = await this.prisma.user.count();
    const tours = await Promise.all(
      TOUR_IDS.map(async (tourId) => {
        const completedCount = await this.prisma.user.count({
          where: { toursCompleted: { has: tourId } },
        });
        const percentage =
          totalUsers > 0 ? (completedCount / totalUsers) * 100 : 0;
        return {
          tourId,
          completedCount,
          percentage: Math.round(percentage * 10) / 10,
        };
      }),
    );
    return { totalUsers, tours };
  }
}
