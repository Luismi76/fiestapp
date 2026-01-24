import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/cache.service';
import { CreateFestivalDto } from './dto/create-festival.dto';

export interface CalendarFilters {
  region?: string;
  type?: string;
  city?: string;
}

export interface FestivalByMonth {
  month: number;
  monthName: string;
  festivals: {
    id: string;
    name: string;
    city: string;
    startDate: Date | null;
    endDate: Date | null;
    region: string | null;
    festivalType: string | null;
    imageUrl: string | null;
    experienceCount: number;
  }[];
}

@Injectable()
export class FestivalsService {
  private readonly logger = new Logger(FestivalsService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Geocodifica una ciudad española usando Nominatim (OpenStreetMap)
   */
  private async geocodeCity(city: string): Promise<{ latitude: number; longitude: number } | null> {
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

  async findAll() {
    return this.cacheService.getOrSet(
      CACHE_KEYS.FESTIVALS_ALL,
      async () => {
        return this.prisma.festival.findMany({
          include: {
            _count: {
              select: {
                experiences: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        });
      },
      CACHE_TTL.FESTIVALS,
    );
  }

  async create(createFestivalDto: CreateFestivalDto) {
    const existing = await this.prisma.festival.findUnique({
      where: { name: createFestivalDto.name },
    });

    if (existing) {
      throw new ConflictException('Ya existe una festividad con este nombre');
    }

    // Geocodificar la ciudad para obtener coordenadas
    const coordinates = await this.geocodeCity(createFestivalDto.city);

    const festival = await this.prisma.festival.create({
      data: {
        name: createFestivalDto.name,
        city: createFestivalDto.city,
        description: createFestivalDto.description,
        imageUrl: createFestivalDto.imageUrl,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      },
    });

    await this.cacheService.invalidateFestivals();

    return festival;
  }

  async findOne(id: string) {
    const festival = await this.cacheService.getOrSet(
      CACHE_KEYS.FESTIVAL(id),
      async () => {
        return this.prisma.festival.findUnique({
          where: { id },
          include: {
            experiences: {
              where: { published: true },
              include: {
                host: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    verified: true,
                  },
                },
              },
              take: 10,
            },
            _count: {
              select: {
                experiences: true,
              },
            },
          },
        });
      },
      CACHE_TTL.FESTIVALS,
    );

    if (!festival) {
      throw new NotFoundException('Festival no encontrado');
    }

    return festival;
  }

  // =============================================
  // CALENDARIO
  // =============================================

  /**
   * Obtiene festivales agrupados por mes para un año específico
   */
  async getCalendarData(
    year: number,
    filters?: CalendarFilters,
  ): Promise<FestivalByMonth[]> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const where: Record<string, unknown> = {
      OR: [
        {
          startDate: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
        {
          // Festivales sin fecha específica
          startDate: null,
        },
      ],
    };

    if (filters?.region) {
      where.region = filters.region;
    }
    if (filters?.type) {
      where.festivalType = filters.type;
    }
    if (filters?.city) {
      where.city = filters.city;
    }

    const festivals = await this.prisma.festival.findMany({
      where,
      include: {
        _count: {
          select: {
            experiences: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Agrupar por mes
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    const byMonth: FestivalByMonth[] = monthNames.map((monthName, index) => ({
      month: index + 1,
      monthName,
      festivals: [],
    }));

    // Festivales sin fecha específica van en un grupo especial
    const noDateFestivals: FestivalByMonth = {
      month: 0,
      monthName: 'Fecha variable',
      festivals: [],
    };

    for (const festival of festivals) {
      const mappedFestival = {
        id: festival.id,
        name: festival.name,
        city: festival.city,
        startDate: festival.startDate,
        endDate: festival.endDate,
        region: festival.region,
        festivalType: festival.festivalType,
        imageUrl: festival.imageUrl,
        experienceCount: festival._count.experiences,
      };

      if (festival.startDate) {
        const month = festival.startDate.getMonth();
        byMonth[month].festivals.push(mappedFestival);
      } else {
        noDateFestivals.festivals.push(mappedFestival);
      }
    }

    // Solo incluir meses con festivales
    const result = byMonth.filter((m) => m.festivals.length > 0);

    // Agregar los sin fecha al final si hay alguno
    if (noDateFestivals.festivals.length > 0) {
      result.push(noDateFestivals);
    }

    return result;
  }

  /**
   * Obtiene lista de regiones únicas
   */
  async getRegions(): Promise<string[]> {
    const festivals = await this.prisma.festival.findMany({
      where: {
        region: { not: null },
      },
      select: {
        region: true,
      },
      distinct: ['region'],
    });

    return festivals
      .map((f) => f.region)
      .filter((r): r is string => r !== null)
      .sort();
  }

  /**
   * Obtiene lista de tipos únicos
   */
  async getTypes(): Promise<string[]> {
    const festivals = await this.prisma.festival.findMany({
      where: {
        festivalType: { not: null },
      },
      select: {
        festivalType: true,
      },
      distinct: ['festivalType'],
    });

    return festivals
      .map((f) => f.festivalType)
      .filter((t): t is string => t !== null)
      .sort();
  }

  /**
   * Obtiene ciudades únicas de festivales
   */
  async getCities(): Promise<string[]> {
    const festivals = await this.prisma.festival.findMany({
      select: {
        city: true,
      },
      distinct: ['city'],
    });

    return festivals.map((f) => f.city).sort();
  }

  /**
   * Obtiene festivales para exportar a iCal
   */
  async getFestivalsForIcal(filters?: CalendarFilters) {
    const where: Record<string, unknown> = {};

    if (filters?.region) {
      where.region = filters.region;
    }
    if (filters?.type) {
      where.festivalType = filters.type;
    }
    if (filters?.city) {
      where.city = filters.city;
    }

    return this.prisma.festival.findMany({
      where,
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async seed() {
    const festivals = [
      {
        name: 'Feria de Abril',
        city: 'Sevilla',
        description:
          'La feria más emblemática de Andalucía con casetas, flamenco y tradición.',
        imageUrl: null,
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 3, 15), // Abril
        endDate: new Date(2026, 3, 21),
        latitude: 37.3891,
        longitude: -5.9845,
      },
      {
        name: 'San Fermin',
        city: 'Pamplona',
        description:
          'Los famosos encierros y las fiestas más internacionales de España.',
        imageUrl: null,
        region: 'Navarra',
        festivalType: 'tradicional',
        startDate: new Date(2026, 6, 6), // Julio
        endDate: new Date(2026, 6, 14),
        latitude: 42.8169,
        longitude: -1.6432,
      },
      {
        name: 'Las Fallas',
        city: 'Valencia',
        description:
          'Arte efímero, pólvora y tradición valenciana en estado puro.',
        imageUrl: null,
        region: 'Comunidad Valenciana',
        festivalType: 'tradicional',
        startDate: new Date(2026, 2, 15), // Marzo
        endDate: new Date(2026, 2, 19),
        latitude: 39.4699,
        longitude: -0.3763,
      },
      {
        name: 'La Tomatina',
        city: 'Bunol',
        description: 'La batalla de tomates más grande del mundo.',
        imageUrl: null,
        region: 'Comunidad Valenciana',
        festivalType: 'tradicional',
        startDate: new Date(2026, 7, 26), // Agosto
        endDate: new Date(2026, 7, 26),
        latitude: 39.4189,
        longitude: -0.7889,
      },
      {
        name: 'Semana Grande',
        city: 'Bilbao',
        description: 'Nueve días de fiesta, conciertos y tradición vasca.',
        imageUrl: null,
        region: 'Pais Vasco',
        festivalType: 'tradicional',
        startDate: new Date(2026, 7, 15), // Agosto
        endDate: new Date(2026, 7, 23),
        latitude: 43.2630,
        longitude: -2.9350,
      },
      {
        name: 'Carnaval de Cadiz',
        city: 'Cadiz',
        description: 'Humor, chirigotas y el carnaval más auténtico de España.',
        imageUrl: null,
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 1, 12), // Febrero
        endDate: new Date(2026, 1, 22),
        latitude: 36.5270,
        longitude: -6.2885,
      },
      {
        name: 'Semana Santa de Sevilla',
        city: 'Sevilla',
        description: 'Procesiones, cofradías y fervor religioso en las calles.',
        imageUrl: null,
        region: 'Andalucia',
        festivalType: 'religioso',
        startDate: new Date(2026, 2, 29), // Marzo/Abril
        endDate: new Date(2026, 3, 5),
        latitude: 37.3886,
        longitude: -5.9823,
      },
      {
        name: 'Feria de Malaga',
        city: 'Malaga',
        description: 'Una semana de fiesta, vino dulce y alegría malagueña.',
        imageUrl: null,
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 7, 8), // Agosto
        endDate: new Date(2026, 7, 16),
        latitude: 36.7213,
        longitude: -4.4214,
      },
      {
        name: 'Moros y Cristianos',
        city: 'Alcoy',
        description: 'Recreación histórica de las batallas entre moros y cristianos.',
        imageUrl: null,
        region: 'Comunidad Valenciana',
        festivalType: 'tradicional',
        startDate: new Date(2026, 3, 22), // Abril
        endDate: new Date(2026, 3, 24),
        latitude: 38.6988,
        longitude: -0.4735,
      },
      {
        name: 'San Isidro',
        city: 'Madrid',
        description: 'Las fiestas patronales de Madrid con verbenas y chotis.',
        imageUrl: null,
        region: 'Madrid',
        festivalType: 'tradicional',
        startDate: new Date(2026, 4, 15), // Mayo
        endDate: new Date(2026, 4, 15),
        latitude: 40.4168,
        longitude: -3.7038,
      },
      {
        name: 'Fiesta de la Merce',
        city: 'Barcelona',
        description: 'La fiesta mayor de Barcelona con castellers, correfocs y más.',
        imageUrl: null,
        region: 'Cataluna',
        festivalType: 'tradicional',
        startDate: new Date(2026, 8, 24), // Septiembre
        endDate: new Date(2026, 8, 27),
        latitude: 41.3851,
        longitude: 2.1734,
      },
      {
        name: 'Feria del Caballo',
        city: 'Jerez de la Frontera',
        description: 'Exhibiciones ecuestres, vino de Jerez y flamenco.',
        imageUrl: null,
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 4, 3), // Mayo
        endDate: new Date(2026, 4, 10),
        latitude: 36.6850,
        longitude: -6.1264,
      },
    ];

    for (const festival of festivals) {
      await this.prisma.festival.upsert({
        where: { name: festival.name },
        update: festival,
        create: festival,
      });
    }

    await this.cacheService.invalidateFestivals();

    return {
      message: 'Festivales creados correctamente',
      count: festivals.length,
    };
  }
}
