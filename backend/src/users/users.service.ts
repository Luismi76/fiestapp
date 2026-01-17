import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Obtener perfil público de un usuario
  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        city: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            experiences: true,
            reviewsReceived: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Calcular rating promedio de reseñas recibidas
    const avgRating = await this.prisma.review.aggregate({
      where: { targetId: userId },
      _avg: { rating: true },
    });

    // Obtener experiencias publicadas del usuario
    const experiences = await this.prisma.experience.findMany({
      where: {
        hostId: userId,
        published: true,
      },
      include: {
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    });

    // Calcular rating promedio para cada experiencia
    const experiencesWithRating = await Promise.all(
      experiences.map(async (exp) => {
        const expRating = await this.prisma.review.aggregate({
          where: { experienceId: exp.id },
          _avg: { rating: true },
        });
        return {
          ...exp,
          avgRating: expRating._avg.rating || 0,
        };
      }),
    );

    // Obtener últimas reseñas recibidas
    const reviews = await this.prisma.review.findMany({
      where: { targetId: userId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        experience: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    return {
      ...user,
      avgRating: avgRating._avg.rating || 0,
      experiences: experiencesWithRating,
      reviews,
    };
  }

  // Actualizar perfil propio
  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateDto,
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        bio: true,
        city: true,
        avatar: true,
        verified: true,
        createdAt: true,
      },
    });
  }

  // Obtener perfil completo propio
  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        bio: true,
        city: true,
        avatar: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            experiences: true,
            matchesAsHost: true,
            matchesAsRequester: true,
            reviewsReceived: true,
            reviewsGiven: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Calcular rating promedio
    const avgRating = await this.prisma.review.aggregate({
      where: { targetId: userId },
      _avg: { rating: true },
    });

    // Estadísticas de matches
    const [pendingReceived, acceptedMatches, completedMatches] = await Promise.all([
      this.prisma.match.count({
        where: { hostId: userId, status: 'pending' },
      }),
      this.prisma.match.count({
        where: {
          OR: [{ hostId: userId }, { requesterId: userId }],
          status: 'accepted',
        },
      }),
      this.prisma.match.count({
        where: {
          OR: [{ hostId: userId }, { requesterId: userId }],
          status: 'completed',
        },
      }),
    ]);

    return {
      ...user,
      avgRating: avgRating._avg.rating || 0,
      stats: {
        pendingReceived,
        acceptedMatches,
        completedMatches,
      },
    };
  }
}
