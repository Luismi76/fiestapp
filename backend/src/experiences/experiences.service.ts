import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/cache.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';

@Injectable()
export class ExperiencesService {
  private readonly logger = new Logger(ExperiencesService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Geocodifica una ciudad española usando Nominatim (OpenStreetMap)
   */
  private async geocodeCity(
    city: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const query = encodeURIComponent(`${city}, España`);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=es`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FiestApp/1.0 (contact@fiestapp.com)',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Geocoding failed for ${city}: HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0 && data[0].lat && data[0].lon) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }

      this.logger.warn(`No geocoding results for ${city}`);
      return null;
    } catch (error) {
      this.logger.error(`Geocoding error for ${city}:`, error);
      return null;
    }
  }

  async create(createDto: CreateExperienceDto, userId: string) {
    // Verificar que el festival existe solo si se proporciona
    if (createDto.festivalId) {
      const festival = await this.prisma.festival.findUnique({
        where: { id: createDto.festivalId },
      });

      if (!festival) {
        throw new NotFoundException('Festival no encontrado');
      }
    }

    // Geocodificar la ciudad para obtener coordenadas
    const coordinates = await this.geocodeCity(createDto.city);

    // Crear experiencia con disponibilidad en una transacción
    const experience = await this.prisma.$transaction(async (tx) => {
      const exp = await tx.experience.create({
        data: {
          title: createDto.title,
          description: createDto.description,
          festivalId: createDto.festivalId,
          category: createDto.category,
          city: createDto.city,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
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
              latitude: true,
              longitude: true,
            },
          },
        },
      });

      // Crear registros de disponibilidad si se proporcionaron fechas
      if (createDto.availability && createDto.availability.length > 0) {
        await tx.experienceAvailability.createMany({
          data: createDto.availability.map((dateStr) => {
            // Parsear la fecha y establecer a mediodía UTC para evitar problemas de zona horaria
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
            return {
              experienceId: exp.id,
              date,
              available: true,
            };
          }),
          skipDuplicates: true,
        });
      }

      return exp;
    });

    // Invalidar cache de experiencias
    await this.cacheService.invalidateExperiences();

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
    // Filtros de compatibilidad familiar
    hostHasPartner?: boolean;
    hostHasChildren?: boolean;
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
      hostHasPartner,
      hostHasChildren,
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

    // Filtros de compatibilidad familiar
    if (hostHasPartner !== undefined || hostHasChildren !== undefined) {
      where.host = {};
      if (hostHasPartner !== undefined) {
        (where.host as Record<string, boolean>).hasPartner = hostHasPartner;
      }
      if (hostHasChildren !== undefined) {
        (where.host as Record<string, boolean>).hasChildren = hostHasChildren;
      }
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
              hasPartner: true,
              hasChildren: true,
              childrenAges: true,
            },
          },
          festival: {
            select: {
              id: true,
              name: true,
              city: true,
              latitude: true,
              longitude: true,
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
    return this.cacheService.getOrSet(
      'experiences:cities',
      async () => {
        const cities = await this.prisma.experience.findMany({
          where: { published: true },
          select: { city: true },
          distinct: ['city'],
          orderBy: { city: 'asc' },
        });
        return cities.map((c) => c.city);
      },
      CACHE_TTL.EXPERIENCES_LIST,
    );
  }

  async findOne(id: string) {
    const cached = await this.cacheService.get<any>(CACHE_KEYS.EXPERIENCE(id));
    if (cached) {
      return cached;
    }

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
            hasPartner: true,
            hasChildren: true,
            childrenAges: true,
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

    const result = {
      ...experience,
      availability: availabilityDates,
      avgRating: avgRating._avg.rating || 0,
    };

    // Cachear por 5 minutos
    await this.cacheService.set(
      CACHE_KEYS.EXPERIENCE(id),
      result,
      CACHE_TTL.EXPERIENCE_DETAIL,
    );

    return result;
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
            latitude: true,
            longitude: true,
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

    // Si se cambia la ciudad, geocodificar las nuevas coordenadas
    let coordinates: { latitude: number; longitude: number } | null = null;
    if (updateData.city && updateData.city !== experience.city) {
      coordinates = await this.geocodeCity(updateData.city);
    }

    // Usar transacción para actualizar experiencia y disponibilidad
    const result = await this.prisma.$transaction(async (tx) => {
      // Actualizar la experiencia
      const updated = await tx.experience.update({
        where: { id },
        data: {
          ...updateData,
          ...(coordinates && {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          }),
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
              latitude: true,
              longitude: true,
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
            data: availability.map((dateStr) => {
              // Parsear la fecha y establecer a mediodía UTC para evitar problemas de zona horaria
              const [year, month, day] = dateStr.split('-').map(Number);
              const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
              return {
                experienceId: id,
                date,
                available: true,
              };
            }),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    // Invalidar cache
    await this.cacheService.invalidateExperience(id);

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

    // Invalidar cache
    await this.cacheService.invalidateExperiences();

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

    const updated = await this.prisma.experience.update({
      where: { id },
      data: {
        published: !experience.published,
      },
    });

    // Invalidar cache
    await this.cacheService.invalidateExperience(id);

    return updated;
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
          if (match.startDate.toISOString().split('T')[0] === dateStr) {
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
