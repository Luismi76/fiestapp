import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  // =============================================
  // EXPERIENCIAS FAVORITAS
  // =============================================

  async addFavorite(userId: string, experienceId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

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
      include: {
        alert: true,
      },
    });
    return {
      isFavorite: !!favorite,
      hasAlert: !!favorite?.alert?.enabled,
    };
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        alert: true,
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
          hasAlert: !!fav.alert?.enabled,
          favoriteId: fav.id,
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

  // =============================================
  // FESTIVALES FAVORITOS
  // =============================================

  async addFestivalFavorite(userId: string, festivalId: string) {
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival no encontrado');
    }

    const favorite = await this.prisma.favoriteFestival.upsert({
      where: {
        userId_festivalId: {
          userId,
          festivalId,
        },
      },
      update: {},
      create: {
        userId,
        festivalId,
      },
    });

    return { message: 'Festival guardado en favoritos', favorite };
  }

  async removeFestivalFavorite(userId: string, festivalId: string) {
    try {
      await this.prisma.favoriteFestival.delete({
        where: {
          userId_festivalId: {
            userId,
            festivalId,
          },
        },
      });
      return { message: 'Festival eliminado de favoritos' };
    } catch {
      return { message: 'El festival no estaba en favoritos' };
    }
  }

  async isFestivalFavorite(userId: string, festivalId: string) {
    const favorite = await this.prisma.favoriteFestival.findUnique({
      where: {
        userId_festivalId: {
          userId,
          festivalId,
        },
      },
    });
    return { isFavorite: !!favorite };
  }

  async getFestivalFavorites(userId: string) {
    const favorites = await this.prisma.favoriteFestival.findMany({
      where: { userId },
      include: {
        festival: {
          include: {
            _count: {
              select: {
                experiences: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites.map((fav) => ({
      ...fav.festival,
      savedAt: fav.createdAt,
      experienceCount: fav.festival._count.experiences,
    }));
  }

  async getFestivalFavoriteIds(userId: string) {
    const favorites = await this.prisma.favoriteFestival.findMany({
      where: { userId },
      select: { festivalId: true },
    });
    return favorites.map((f) => f.festivalId);
  }

  // =============================================
  // ALERTAS DE DISPONIBILIDAD
  // =============================================

  async enableAlert(userId: string, experienceId: string) {
    // Verificar que existe el favorito
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_experienceId: {
          userId,
          experienceId,
        },
      },
    });

    if (!favorite) {
      // Si no existe el favorito, crearlo primero
      await this.addFavorite(userId, experienceId);
      const newFavorite = await this.prisma.favorite.findUnique({
        where: {
          userId_experienceId: {
            userId,
            experienceId,
          },
        },
      });

      if (!newFavorite) {
        throw new NotFoundException('Error al crear favorito');
      }

      const alert = await this.prisma.favoriteAlert.create({
        data: {
          favoriteId: newFavorite.id,
          enabled: true,
        },
      });

      return { message: 'Alerta de disponibilidad activada', alert };
    }

    // Crear o actualizar la alerta
    const alert = await this.prisma.favoriteAlert.upsert({
      where: {
        favoriteId: favorite.id,
      },
      update: {
        enabled: true,
      },
      create: {
        favoriteId: favorite.id,
        enabled: true,
      },
    });

    return { message: 'Alerta de disponibilidad activada', alert };
  }

  async disableAlert(userId: string, experienceId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_experienceId: {
          userId,
          experienceId,
        },
      },
      include: {
        alert: true,
      },
    });

    if (!favorite?.alert) {
      return { message: 'No habia alerta activa' };
    }

    await this.prisma.favoriteAlert.update({
      where: {
        id: favorite.alert.id,
      },
      data: {
        enabled: false,
      },
    });

    return { message: 'Alerta de disponibilidad desactivada' };
  }

  async getAlertsStatus(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        alert: true,
        experience: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return favorites
      .filter((fav) => fav.alert?.enabled)
      .map((fav) => ({
        experienceId: fav.experienceId,
        experienceTitle: fav.experience.title,
        alertEnabled: fav.alert?.enabled || false,
        lastNotified: fav.alert?.lastNotified,
      }));
  }

  // =============================================
  // COMBINADO
  // =============================================

  async getAllFavorites(userId: string) {
    const [experiences, festivals] = await Promise.all([
      this.getFavorites(userId),
      this.getFestivalFavorites(userId),
    ]);

    return {
      experiences,
      festivals,
      counts: {
        experiences: experiences.length,
        festivals: festivals.length,
        total: experiences.length + festivals.length,
      },
    };
  }
}
