import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SaveSearchDto {
  query: string;
  filters?: {
    city?: string;
    festival?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    languages?: string[];
    accessibility?: string[];
  };
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Guarda una busqueda en el historial del usuario
   */
  async saveSearch(userId: string, dto: SaveSearchDto) {
    // No guardar busquedas vacias
    if (!dto.query?.trim()) return null;

    return this.prisma.searchHistory.create({
      data: {
        userId,
        query: dto.query.trim(),
        filters: dto.filters ?? undefined,
      },
    });
  }

  /**
   * Obtiene las ultimas busquedas del usuario
   */
  async getHistory(userId: string, limit = 10) {
    const searches = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      distinct: ['query'],
    });

    return searches.map((s) => ({
      id: s.id,
      query: s.query,
      filters: s.filters,
      searchedAt: s.createdAt,
    }));
  }

  /**
   * Limpia el historial del usuario
   */
  async clearHistory(userId: string) {
    await this.prisma.searchHistory.deleteMany({
      where: { userId },
    });
    return { message: 'Historial limpiado' };
  }

  /**
   * Elimina una busqueda especifica del historial
   */
  async deleteSearch(userId: string, searchId: string) {
    await this.prisma.searchHistory.deleteMany({
      where: { id: searchId, userId },
    });
    return { message: 'Busqueda eliminada' };
  }

  /**
   * Obtiene busquedas populares (anonimas)
   */
  async getPopularSearches(limit = 10) {
    const searches = await this.prisma.searchHistory.groupBy({
      by: ['query'],
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
    });

    return searches.map((s) => ({
      query: s.query,
      count: s._count.query,
    }));
  }

  /**
   * Autocomplete: busca en experiencias, festivales y ciudades
   */
  async autocomplete(query: string, limit = 10) {
    if (!query || query.length < 2) {
      return {
        experiences: [],
        festivals: [],
        cities: [],
      };
    }

    const searchTerm = query.toLowerCase();

    // Buscar en paralelo
    const [experiences, festivals, cities] = await Promise.all([
      // Experiencias
      this.prisma.experience.findMany({
        where: {
          published: true,
          title: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          title: true,
          city: true,
          type: true,
          avgRating: true,
          photos: true,
        },
        take: limit,
      }),

      // Festivales
      this.prisma.festival.findMany({
        where: {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          city: true,
          imageUrl: true,
          _count: {
            select: {
              experiences: true,
            },
          },
        },
        take: limit,
      }),

      // Ciudades unicas
      this.prisma.experience.findMany({
        where: {
          published: true,
          city: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        select: {
          city: true,
        },
        distinct: ['city'],
        take: limit,
      }),
    ]);

    return {
      experiences: experiences.map((e) => ({
        id: e.id,
        title: e.title,
        city: e.city,
        type: e.type,
        avgRating: e.avgRating,
        photo: e.photos?.[0] || null,
        category: 'experience' as const,
      })),
      festivals: festivals.map((f) => ({
        id: f.id,
        name: f.name,
        city: f.city,
        imageUrl: f.imageUrl,
        experienceCount: f._count.experiences,
        category: 'festival' as const,
      })),
      cities: cities.map((c) => ({
        name: c.city,
        category: 'city' as const,
      })),
    };
  }
}
