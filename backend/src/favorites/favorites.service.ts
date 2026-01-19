import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavorite(userId: string, experienceId: string) {
    // Verificar que la experiencia existe
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    // Crear o ignorar si ya existe
    const favorite = await this.prisma.favorite.upsert({
      where: {
        userId_experienceId: {
          userId,
          experienceId,
        },
      },
      update: {},
      create: {
        userId,
        experienceId,
      },
    });

    return { message: 'Experiencia guardada en favoritos', favorite };
  }

  async removeFavorite(userId: string, experienceId: string) {
    try {
      await this.prisma.favorite.delete({
        where: {
          userId_experienceId: {
            userId,
            experienceId,
          },
        },
      });
      return { message: 'Experiencia eliminada de favoritos' };
    } catch {
      return { message: 'La experiencia no estaba en favoritos' };
    }
  }

  async isFavorite(userId: string, experienceId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_experienceId: {
          userId,
          experienceId,
        },
      },
    });
    return { isFavorite: !!favorite };
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        experience: {
          include: {
            host: {
              select: {
                id: true,
                name: true,
                avatar: true,
                verified: true,
              },
            },
            festival: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
            _count: {
              select: {
                reviews: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcular rating promedio para cada experiencia
    const experiencesWithRating = await Promise.all(
      favorites.map(async (fav) => {
        const avgRating = await this.prisma.review.aggregate({
          where: { experienceId: fav.experience.id },
          _avg: { rating: true },
        });
        return {
          ...fav.experience,
          avgRating: avgRating._avg.rating || 0,
          savedAt: fav.createdAt,
        };
      }),
    );

    return experiencesWithRating;
  }

  async getFavoriteIds(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { experienceId: true },
    });
    return favorites.map((f) => f.experienceId);
  }
}
