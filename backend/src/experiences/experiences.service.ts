import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';

@Injectable()
export class ExperiencesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateExperienceDto, userId: string) {
    // Verificar que el festival existe
    const festival = await this.prisma.festival.findUnique({
      where: { id: createDto.festivalId },
    });

    if (!festival) {
      throw new NotFoundException('Festival no encontrado');
    }

    return this.prisma.experience.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        festivalId: createDto.festivalId,
        city: createDto.city,
        price: createDto.price,
        type: createDto.type,
        photos: createDto.photos || [],
        highlights: createDto.highlights || [],
        hostId: userId,
      },
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
      },
    });
  }

  async findAll(options?: {
    festivalId?: string;
    city?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) {
    const {
      festivalId,
      city,
      type,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
    } = options || {};

    const where: Record<string, unknown> = {
      published: true,
    };

    if (festivalId) {
      where.festivalId = festivalId;
    }

    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive',
      };
    }

    if (type) {
      where.type = type;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        (where.price as Record<string, number>).gte = minPrice;
      }
      if (maxPrice !== undefined) {
        (where.price as Record<string, number>).lte = maxPrice;
      }
    }

    const skip = (page - 1) * limit;

    const [experiences, total] = await Promise.all([
      this.prisma.experience.findMany({
        where,
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
              matches: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.experience.count({ where }),
    ]);

    // Calcular rating promedio para cada experiencia
    const experiencesWithRating = await Promise.all(
      experiences.map(async (exp) => {
        const avgRating = await this.prisma.review.aggregate({
          where: { experienceId: exp.id },
          _avg: { rating: true },
        });
        return {
          ...exp,
          avgRating: avgRating._avg.rating || 0,
        };
      }),
    );

    return {
      data: experiencesWithRating,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
            bio: true,
            city: true,
          },
        },
        festival: true,
        reviews: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        _count: {
          select: {
            reviews: true,
            matches: true,
          },
        },
      },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    // Calcular rating promedio
    const avgRating = await this.prisma.review.aggregate({
      where: { experienceId: id },
      _avg: { rating: true },
    });

    return {
      ...experience,
      avgRating: avgRating._avg.rating || 0,
    };
  }

  async findByHost(hostId: string) {
    const experiences = await this.prisma.experience.findMany({
      where: { hostId },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            matches: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcular rating promedio para cada experiencia
    const experiencesWithRating = await Promise.all(
      experiences.map(async (exp) => {
        const avgRating = await this.prisma.review.aggregate({
          where: { experienceId: exp.id },
          _avg: { rating: true },
        });
        return {
          ...exp,
          avgRating: avgRating._avg.rating || 0,
        };
      }),
    );

    return experiencesWithRating;
  }

  async update(id: string, updateDto: UpdateExperienceDto, userId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    if (experience.hostId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para editar esta experiencia',
      );
    }

    return this.prisma.experience.update({
      where: { id },
      data: updateDto,
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
      },
    });
  }

  async remove(id: string, userId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    if (experience.hostId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta experiencia',
      );
    }

    await this.prisma.experience.delete({
      where: { id },
    });

    return { message: 'Experiencia eliminada correctamente' };
  }

  async togglePublished(id: string, userId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    if (experience.hostId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta experiencia',
      );
    }

    return this.prisma.experience.update({
      where: { id },
      data: {
        published: !experience.published,
      },
    });
  }
}
