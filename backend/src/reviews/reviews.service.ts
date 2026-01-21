import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // Crear una reseña
  async create(createDto: CreateReviewDto, authorId: string) {
    // Verificar que la experiencia existe
    const experience = await this.prisma.experience.findUnique({
      where: { id: createDto.experienceId },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    // Verificar que el target existe
    const target = await this.prisma.user.findUnique({
      where: { id: createDto.targetId },
    });

    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // No puede reseñarse a sí mismo
    if (authorId === createDto.targetId) {
      throw new BadRequestException('No puedes reseñarte a ti mismo');
    }

    // Verificar que existe un match completado entre author y la experiencia
    const completedMatch = await this.prisma.match.findFirst({
      where: {
        experienceId: createDto.experienceId,
        status: 'completed',
        OR: [
          { requesterId: authorId, hostId: createDto.targetId },
          { hostId: authorId, requesterId: createDto.targetId },
        ],
      },
    });

    if (!completedMatch) {
      throw new BadRequestException(
        'Solo puedes reseñar después de completar una experiencia',
      );
    }

    // Verificar que no existe ya una reseña del mismo autor para esta experiencia
    const existingReview = await this.prisma.review.findUnique({
      where: {
        experienceId_authorId: {
          experienceId: createDto.experienceId,
          authorId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException(
        'Ya has dejado una reseña para esta experiencia',
      );
    }

    // Crear la reseña
    return this.prisma.review.create({
      data: {
        experienceId: createDto.experienceId,
        authorId,
        targetId: createDto.targetId,
        rating: createDto.rating,
        comment: createDto.comment,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        target: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        experience: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  // Obtener reseñas de una experiencia
  async findByExperience(experienceId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { experienceId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              verified: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { experienceId } }),
    ]);

    // Calcular estadísticas
    const stats = await this.prisma.review.aggregate({
      where: { experienceId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Distribución de ratings
    const distribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { experienceId },
      _count: true,
    });

    const ratingDistribution = [1, 2, 3, 4, 5].reduce(
      (acc, rating) => {
        const found = distribution.find((d) => d.rating === rating);
        acc[rating] = found ? found._count : 0;
        return acc;
      },
      {} as Record<number, number>,
    );

    return {
      data: reviews,
      stats: {
        avgRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating,
        distribution: ratingDistribution,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener reseñas recibidas por un usuario
  async findReceivedByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
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
              festival: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { targetId: userId } }),
    ]);

    // Calcular estadísticas
    const stats = await this.prisma.review.aggregate({
      where: { targetId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      data: reviews,
      stats: {
        avgRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener reseñas escritas por un usuario
  async findWrittenByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { authorId: userId },
        include: {
          target: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          experience: {
            select: {
              id: true,
              title: true,
              festival: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { authorId: userId } }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener una reseña por ID
  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        target: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        experience: {
          select: {
            id: true,
            title: true,
            festival: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    return review;
  }

  // Actualizar una reseña (solo el autor puede hacerlo)
  async update(id: string, updateDto: UpdateReviewDto, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    if (review.authorId !== userId) {
      throw new ForbiddenException('No puedes editar esta reseña');
    }

    return this.prisma.review.update({
      where: { id },
      data: updateDto,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  // Eliminar una reseña (solo el autor puede hacerlo)
  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    if (review.authorId !== userId) {
      throw new ForbiddenException('No puedes eliminar esta reseña');
    }

    await this.prisma.review.delete({
      where: { id },
    });

    return { message: 'Reseña eliminada correctamente' };
  }

  // Verificar si un usuario puede dejar reseña para una experiencia/match
  async canReview(experienceId: string, userId: string) {
    // Buscar match completado
    const completedMatch = await this.prisma.match.findFirst({
      where: {
        experienceId,
        status: 'completed',
        OR: [{ requesterId: userId }, { hostId: userId }],
      },
      include: {
        experience: {
          include: {
            host: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!completedMatch) {
      return { canReview: false, reason: 'No hay match completado' };
    }

    // Verificar si ya dejó reseña
    const existingReview = await this.prisma.review.findUnique({
      where: {
        experienceId_authorId: {
          experienceId,
          authorId: userId,
        },
      },
    });

    if (existingReview) {
      return {
        canReview: false,
        reason: 'Ya dejaste una reseña',
        existingReview,
      };
    }

    // Determinar a quién puede reseñar
    const isHost = completedMatch.hostId === userId;
    const targetUser = isHost
      ? completedMatch.requester
      : completedMatch.experience.host;

    return {
      canReview: true,
      match: completedMatch,
      targetUser,
    };
  }

  // ============================================
  // Respuestas del anfitrion
  // ============================================

  /**
   * Responder a una resena (solo el host de la experiencia puede hacerlo)
   */
  async respondToReview(reviewId: string, hostId: string, response: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        experience: {
          select: { hostId: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Resena no encontrada');
    }

    // Solo el host de la experiencia puede responder
    if (review.experience.hostId !== hostId) {
      throw new ForbiddenException('Solo el anfitrion puede responder a esta resena');
    }

    // Solo una respuesta por resena
    if (review.hostResponse) {
      throw new BadRequestException('Ya has respondido a esta resena');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        hostResponse: response,
        hostResponseAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        target: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        experience: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Actualizar respuesta a una resena
   */
  async updateResponse(reviewId: string, hostId: string, response: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        experience: {
          select: { hostId: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Resena no encontrada');
    }

    if (review.experience.hostId !== hostId) {
      throw new ForbiddenException('Solo el anfitrion puede editar esta respuesta');
    }

    if (!review.hostResponse) {
      throw new BadRequestException('No hay respuesta que editar');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        hostResponse: response,
        hostResponseAt: new Date(),
      },
    });
  }

  /**
   * Eliminar respuesta a una resena
   */
  async deleteResponse(reviewId: string, hostId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        experience: {
          select: { hostId: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Resena no encontrada');
    }

    if (review.experience.hostId !== hostId) {
      throw new ForbiddenException('Solo el anfitrion puede eliminar esta respuesta');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        hostResponse: null,
        hostResponseAt: null,
      },
    });
  }
}
