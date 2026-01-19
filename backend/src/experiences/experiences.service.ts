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

    // Crear experiencia con disponibilidad en una transacción
    const experience = await this.prisma.$transaction(async (tx) => {
      const exp = await tx.experience.create({
        data: {
          title: createDto.title,
          description: createDto.description,
          festivalId: createDto.festivalId,
          city: createDto.city,
          price: createDto.price,
          type: createDto.type,
          photos: createDto.photos || [],
          highlights: createDto.highlights || [],
          capacity: createDto.capacity || 1,
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

      // Crear registros de disponibilidad si se proporcionaron fechas
      if (createDto.availability && createDto.availability.length > 0) {
        await tx.experienceAvailability.createMany({
          data: createDto.availability.map((dateStr) => ({
            experienceId: exp.id,
            date: new Date(dateStr),
            available: true,
          })),
          skipDuplicates: true,
        });
      }

      return exp;
    });

    return experience;
  }

  async findAll(options?: {
    festivalId?: string;
    city?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
    page?: number;
    limit?: number;
  }) {
    const {
      festivalId,
      city,
      type,
      minPrice,
      maxPrice,
      search,
      sortBy = 'newest',
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

    // Busqueda por texto
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { festival: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Ordenacion
    let orderBy: Record<string, string> | Record<string, string>[];
    switch (sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        // Para rating ordenamos despues de obtener los datos
        orderBy = { createdAt: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
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
        orderBy,
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

    // Si ordenamos por rating, lo hacemos aqui
    let sortedExperiences = experiencesWithRating;
    if (sortBy === 'rating') {
      sortedExperiences = [...experiencesWithRating].sort(
        (a, b) => b.avgRating - a.avgRating,
      );
    }

    return {
      data: sortedExperiences,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCities(): Promise<string[]> {
    const cities = await this.prisma.experience.findMany({
      where: { published: true },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });
    return cities.map((c) => c.city);
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
        availability: {
          where: {
            available: true,
            date: {
              gte: new Date(),
            },
          },
          orderBy: {
            date: 'asc',
          },
          select: {
            date: true,
          },
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

    // Transformar availability a array de fechas
    const availabilityDates = experience.availability.map((a) => a.date);

    return {
      ...experience,
      availability: availabilityDates,
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

    // Extraer availability del DTO para manejarlo por separado
    const { availability, ...updateData } = updateDto;

    // Usar transacción para actualizar experiencia y disponibilidad
    const result = await this.prisma.$transaction(async (tx) => {
      // Actualizar la experiencia
      const updated = await tx.experience.update({
        where: { id },
        data: updateData,
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

      // Si se proporcionaron fechas de disponibilidad, reemplazar todas
      if (availability !== undefined) {
        // Eliminar disponibilidad existente
        await tx.experienceAvailability.deleteMany({
          where: { experienceId: id },
        });

        // Crear nuevas fechas de disponibilidad
        if (availability.length > 0) {
          await tx.experienceAvailability.createMany({
            data: availability.map((dateStr) => ({
              experienceId: id,
              date: new Date(dateStr),
              available: true,
            })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    return result;
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

  // Obtener ocupación por fechas para una experiencia
  async getOccupancy(experienceId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      select: {
        id: true,
        capacity: true,
        availability: {
          where: {
            available: true,
            date: { gte: new Date() },
          },
          select: { date: true },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    // Obtener todos los matches activos (pending o accepted) para esta experiencia
    const activeMatches = await this.prisma.match.findMany({
      where: {
        experienceId,
        status: { in: ['pending', 'accepted'] },
        startDate: { not: null },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    // Calcular ocupación por cada fecha disponible
    const occupancyMap: Record<
      string,
      { date: string; booked: number; capacity: number; status: string }
    > = {};

    for (const avail of experience.availability) {
      const dateStr = avail.date.toISOString().split('T')[0];
      const dateTime = avail.date.getTime();

      // Contar cuántos matches incluyen esta fecha
      let booked = 0;
      for (const match of activeMatches) {
        if (match.startDate && match.endDate) {
          const start = match.startDate.getTime();
          const end = match.endDate.getTime();
          if (dateTime >= start && dateTime <= end) {
            booked++;
          }
        } else if (match.startDate) {
          // Solo fecha de inicio (un día)
          if (
            match.startDate.toISOString().split('T')[0] === dateStr
          ) {
            booked++;
          }
        }
      }

      // Determinar estado
      let status: string;
      if (booked === 0) {
        status = 'available';
      } else if (booked >= experience.capacity) {
        status = 'full';
      } else {
        status = 'partial';
      }

      occupancyMap[dateStr] = {
        date: dateStr,
        booked,
        capacity: experience.capacity,
        status,
      };
    }

    return {
      capacity: experience.capacity,
      dates: Object.values(occupancyMap),
    };
  }
}
