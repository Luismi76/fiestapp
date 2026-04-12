import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/cache.service';
import { CreateFestivalDto } from './dto/create-festival.dto';
import { UpdateFestivalDto } from './dto/update-festival.dto';

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
export class FestivalsService implements OnModuleInit {
  private readonly logger = new Logger(FestivalsService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async onModuleInit() {
    const count = await this.prisma.festival.count();
    if (count === 0) {
      this.logger.log(
        'No hay festividades en la BD, ejecutando seed automático...',
      );
      await this.seed();
    }
  }

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
        this.logger.warn(
          `Geocoding failed for ${city}: HTTP ${response.status}`,
        );
        return null;
      }

      const data = (await response.json()) as
        | { lat: string; lon: string }[]
        | null;

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
        return this.prisma.festival
          .findMany({
            where: { status: 'ACTIVE' },
            include: {
              _count: {
                select: {
                  experiences: true,
                  favoritedBy: true,
                },
              },
            },
            orderBy: {
              name: 'asc',
            },
          })
          .catch(async () => {
            // Fallback sin _count si la query compleja falla
            this.logger.warn(
              'Festival findAll with _count failed, falling back to simple query',
            );
            return this.prisma.festival.findMany({
              where: { status: 'ACTIVE' },
              orderBy: { name: 'asc' },
            });
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
        startDate: createFestivalDto.startDate
          ? new Date(createFestivalDto.startDate)
          : undefined,
        endDate: createFestivalDto.endDate
          ? new Date(createFestivalDto.endDate)
          : undefined,
      },
    });

    await this.cacheService.invalidateFestivals();

    return festival;
  }

  async update(id: string, updateFestivalDto: UpdateFestivalDto) {
    const existing = await this.prisma.festival.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Festival no encontrado');
    }

    // Si se cambia el nombre, verificar que no exista otro con el mismo nombre
    if (updateFestivalDto.name && updateFestivalDto.name !== existing.name) {
      const nameExists = await this.prisma.festival.findUnique({
        where: { name: updateFestivalDto.name },
      });
      if (nameExists) {
        throw new ConflictException('Ya existe una festividad con este nombre');
      }
    }

    // Si se cambia la ciudad, re-geocodificar
    let coordinates: { latitude: number; longitude: number } | null = null;
    if (updateFestivalDto.city && updateFestivalDto.city !== existing.city) {
      coordinates = await this.geocodeCity(updateFestivalDto.city);
    }

    const updateData: Record<string, unknown> = {};

    if (updateFestivalDto.name) {
      updateData.name = updateFestivalDto.name;
    }
    if (updateFestivalDto.city) {
      updateData.city = updateFestivalDto.city;
    }
    if (updateFestivalDto.description !== undefined) {
      updateData.description = updateFestivalDto.description;
    }
    if (updateFestivalDto.imageUrl !== undefined) {
      updateData.imageUrl = updateFestivalDto.imageUrl;
    }
    if (coordinates) {
      updateData.latitude = coordinates.latitude;
      updateData.longitude = coordinates.longitude;
    }
    if (updateFestivalDto.startDate !== undefined) {
      updateData.startDate = updateFestivalDto.startDate
        ? new Date(updateFestivalDto.startDate)
        : null;
    }
    if (updateFestivalDto.endDate !== undefined) {
      updateData.endDate = updateFestivalDto.endDate
        ? new Date(updateFestivalDto.endDate)
        : null;
    }

    const festival = await this.prisma.festival.update({
      where: { id },
      data: updateData,
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
          // Festivales sin fecha específica pero con experiencias que tienen disponibilidad en el año
          startDate: null,
          experiences: {
            some: {
              availability: {
                some: {
                  date: {
                    gte: startOfYear,
                    lte: endOfYear,
                  },
                },
              },
            },
          },
        },
        {
          // Festivales sin fecha y sin experiencias con disponibilidad
          startDate: null,
          experiences: {
            none: {
              availability: {
                some: {
                  date: {
                    gte: startOfYear,
                    lte: endOfYear,
                  },
                },
              },
            },
          },
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
        // Incluir la disponibilidad de las experiencias para obtener la fecha más temprana
        experiences: {
          select: {
            availability: {
              where: {
                date: {
                  gte: startOfYear,
                  lte: endOfYear,
                },
              },
              orderBy: {
                date: 'asc',
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Agrupar por mes
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
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
      // Obtener la fecha más temprana de disponibilidad de las experiencias
      let earliestAvailabilityDate: Date | null = null;
      for (const exp of festival.experiences) {
        if (exp.availability && exp.availability.length > 0) {
          const expDate = exp.availability[0].date;
          if (!earliestAvailabilityDate || expDate < earliestAvailabilityDate) {
            earliestAvailabilityDate = expDate;
          }
        }
      }

      // Usar la fecha del festival, o la fecha más temprana de disponibilidad como fallback
      const effectiveDate = festival.startDate || earliestAvailabilityDate;

      const mappedFestival = {
        id: festival.id,
        name: festival.name,
        city: festival.city,
        startDate: effectiveDate,
        endDate: festival.endDate,
        region: festival.region,
        festivalType: festival.festivalType,
        imageUrl: festival.imageUrl,
        experienceCount: festival._count.experiences,
      };

      if (effectiveDate) {
        const month = effectiveDate.getMonth();
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
      // === ANDALUCIA ===
      {
        name: 'Feria de Abril',
        city: 'Sevilla',
        description:
          'La feria más emblemática de Andalucía con casetas, flamenco y tradición.',
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 3, 15),
        endDate: new Date(2026, 3, 21),
        latitude: 37.3891,
        longitude: -5.9845,
        imageUrl: null,
      },
      {
        name: 'Semana Santa de Sevilla',
        city: 'Sevilla',
        description: 'Procesiones, cofradías y fervor religioso en las calles.',
        region: 'Andalucia',
        festivalType: 'religioso',
        startDate: new Date(2026, 2, 29),
        endDate: new Date(2026, 3, 5),
        latitude: 37.3886,
        longitude: -5.9823,
        imageUrl: null,
      },
      {
        name: 'Carnaval de Cádiz',
        city: 'Cádiz',
        description: 'Humor, chirigotas y el carnaval más auténtico de España.',
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 1, 12),
        endDate: new Date(2026, 1, 22),
        latitude: 36.527,
        longitude: -6.2885,
        imageUrl: null,
      },
      {
        name: 'Feria de Málaga',
        city: 'Málaga',
        description: 'Una semana de fiesta, vino dulce y alegría malagueña.',
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 7, 8),
        endDate: new Date(2026, 7, 16),
        latitude: 36.7213,
        longitude: -4.4214,
        imageUrl: null,
      },
      {
        name: 'Feria del Caballo',
        city: 'Jerez de la Frontera',
        description: 'Exhibiciones ecuestres, vino de Jerez y flamenco.',
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 4, 3),
        endDate: new Date(2026, 4, 10),
        latitude: 36.685,
        longitude: -6.1264,
        imageUrl: null,
      },
      {
        name: 'Romería del Rocío',
        city: 'Almonte',
        description:
          'Peregrinación multitudinaria a la aldea del Rocío en Huelva.',
        region: 'Andalucia',
        festivalType: 'religioso',
        startDate: new Date(2026, 4, 31),
        endDate: new Date(2026, 5, 1),
        latitude: 37.1316,
        longitude: -6.4863,
        imageUrl: null,
      },
      {
        name: 'Cruces de Mayo',
        city: 'Córdoba',
        description:
          'Los patios y calles de Córdoba se llenan de cruces florales.',
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 4, 1),
        endDate: new Date(2026, 4, 4),
        latitude: 37.8882,
        longitude: -4.7794,
        imageUrl: null,
      },
      {
        name: 'Fiestas Colombinas',
        city: 'Huelva',
        description:
          'Celebración del descubrimiento de América con feria y eventos culturales.',
        region: 'Andalucia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 7, 1),
        endDate: new Date(2026, 7, 7),
        latitude: 37.2614,
        longitude: -6.9447,
        imageUrl: null,
      },
      // === COMUNIDAD VALENCIANA ===
      {
        name: 'Las Fallas',
        city: 'Valencia',
        description:
          'Arte efímero, pólvora y tradición valenciana en estado puro.',
        region: 'Comunidad Valenciana',
        festivalType: 'tradicional',
        startDate: new Date(2026, 2, 15),
        endDate: new Date(2026, 2, 19),
        latitude: 39.4699,
        longitude: -0.3763,
        imageUrl: null,
      },
      {
        name: 'La Tomatina',
        city: 'Buñol',
        description: 'La batalla de tomates más grande del mundo.',
        region: 'Comunidad Valenciana',
        festivalType: 'tradicional',
        startDate: new Date(2026, 7, 26),
        endDate: new Date(2026, 7, 26),
        latitude: 39.4189,
        longitude: -0.7889,
        imageUrl: null,
      },
      {
        name: 'Moros y Cristianos',
        city: 'Alcoy',
        description:
          'Recreación histórica de las batallas entre moros y cristianos.',
        region: 'Comunidad Valenciana',
        festivalType: 'tradicional',
        startDate: new Date(2026, 3, 22),
        endDate: new Date(2026, 3, 24),
        latitude: 38.6988,
        longitude: -0.4735,
        imageUrl: null,
      },
      {
        name: 'Hogueras de San Juan',
        city: 'Alicante',
        description:
          'Hogueras monumentales, mascletàs y la noche mágica de San Juan.',
        region: 'Comunidad Valenciana',
        festivalType: 'tradicional',
        startDate: new Date(2026, 5, 20),
        endDate: new Date(2026, 5, 24),
        latitude: 38.3452,
        longitude: -0.4815,
        imageUrl: null,
      },
      {
        name: 'Fiestas de la Magdalena',
        city: 'Castellón',
        description:
          'Fiestas fundacionales de Castellón con la Romería de les Canyes.',
        region: 'Comunidad Valenciana',
        festivalType: 'tradicional',
        startDate: new Date(2026, 2, 14),
        endDate: new Date(2026, 2, 22),
        latitude: 39.9864,
        longitude: -0.0513,
        imageUrl: null,
      },
      // === NAVARRA / PAIS VASCO ===
      {
        name: 'San Fermín',
        city: 'Pamplona',
        description:
          'Los famosos encierros y las fiestas más internacionales de España.',
        region: 'Navarra',
        festivalType: 'tradicional',
        startDate: new Date(2026, 6, 6),
        endDate: new Date(2026, 6, 14),
        latitude: 42.8169,
        longitude: -1.6432,
        imageUrl: null,
      },
      {
        name: 'Semana Grande de Bilbao',
        city: 'Bilbao',
        description: 'Nueve días de fiesta, conciertos y tradición vasca.',
        region: 'Pais Vasco',
        festivalType: 'tradicional',
        startDate: new Date(2026, 7, 15),
        endDate: new Date(2026, 7, 23),
        latitude: 43.263,
        longitude: -2.935,
        imageUrl: null,
      },
      {
        name: 'Tamborrada de San Sebastián',
        city: 'San Sebastián',
        description:
          'Tambores, barriles y desfiles que celebran el patrón de la ciudad.',
        region: 'Pais Vasco',
        festivalType: 'tradicional',
        startDate: new Date(2026, 0, 20),
        endDate: new Date(2026, 0, 20),
        latitude: 43.3183,
        longitude: -1.9812,
        imageUrl: null,
      },
      // === CATALUÑA ===
      {
        name: 'La Mercè',
        city: 'Barcelona',
        description:
          'La fiesta mayor de Barcelona con castellers, correfocs y más.',
        region: 'Cataluna',
        festivalType: 'tradicional',
        startDate: new Date(2026, 8, 24),
        endDate: new Date(2026, 8, 27),
        latitude: 41.3851,
        longitude: 2.1734,
        imageUrl: null,
      },
      {
        name: 'Sant Joan',
        city: 'Barcelona',
        description:
          'La noche más corta del año con hogueras, petardos y verbena.',
        region: 'Cataluna',
        festivalType: 'tradicional',
        startDate: new Date(2026, 5, 23),
        endDate: new Date(2026, 5, 24),
        latitude: 41.3851,
        longitude: 2.1734,
        imageUrl: null,
      },
      {
        name: 'Patum de Berga',
        city: 'Berga',
        description:
          'Fiesta medieval con fuego y figuras míticas, Patrimonio de la Humanidad.',
        region: 'Cataluna',
        festivalType: 'tradicional',
        startDate: new Date(2026, 5, 3),
        endDate: new Date(2026, 5, 7),
        latitude: 42.101,
        longitude: 1.8456,
        imageUrl: null,
      },
      // === MADRID ===
      {
        name: 'San Isidro',
        city: 'Madrid',
        description:
          'Las fiestas patronales de Madrid con verbenas, chotis y pradera.',
        region: 'Madrid',
        festivalType: 'tradicional',
        startDate: new Date(2026, 4, 15),
        endDate: new Date(2026, 4, 15),
        latitude: 40.4168,
        longitude: -3.7038,
        imageUrl: null,
      },
      {
        name: 'Orgullo de Madrid',
        city: 'Madrid',
        description:
          'La mayor celebración LGTBI+ de Europa con desfiles y conciertos.',
        region: 'Madrid',
        festivalType: 'tradicional',
        startDate: new Date(2026, 6, 1),
        endDate: new Date(2026, 6, 5),
        latitude: 40.42,
        longitude: -3.697,
        imageUrl: null,
      },
      // === GALICIA ===
      {
        name: 'Fiestas del Apóstol',
        city: 'Santiago de Compostela',
        description:
          'Celebración del patrón de España con fuegos y tradición gallega.',
        region: 'Galicia',
        festivalType: 'religioso',
        startDate: new Date(2026, 6, 18),
        endDate: new Date(2026, 6, 31),
        latitude: 42.8782,
        longitude: -8.5448,
        imageUrl: null,
      },
      {
        name: 'Arde Lucus',
        city: 'Lugo',
        description:
          'Recreación histórica de la Lugo romana con mercados y legiones.',
        region: 'Galicia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 5, 18),
        endDate: new Date(2026, 5, 21),
        latitude: 43.0097,
        longitude: -7.5567,
        imageUrl: null,
      },
      // === CASTILLA Y LEON ===
      {
        name: 'Semana Santa de Valladolid',
        city: 'Valladolid',
        description: 'Procesiones de gran sobriedad y valor escultórico.',
        region: 'Castilla y Leon',
        festivalType: 'religioso',
        startDate: new Date(2026, 2, 29),
        endDate: new Date(2026, 3, 5),
        latitude: 41.6523,
        longitude: -4.7245,
        imageUrl: null,
      },
      {
        name: 'Fiestas de San Juan',
        city: 'Soria',
        description:
          'Las fiestas más antiguas de España documentadas, tradición medieval.',
        region: 'Castilla y Leon',
        festivalType: 'tradicional',
        startDate: new Date(2026, 5, 22),
        endDate: new Date(2026, 5, 29),
        latitude: 41.7636,
        longitude: -2.4649,
        imageUrl: null,
      },
      // === ARAGON ===
      {
        name: 'Fiestas del Pilar',
        city: 'Zaragoza',
        description:
          'Diez días de ofrenda de flores, jotas y la Virgen del Pilar.',
        region: 'Aragon',
        festivalType: 'religioso',
        startDate: new Date(2026, 9, 5),
        endDate: new Date(2026, 9, 13),
        latitude: 41.6561,
        longitude: -0.8773,
        imageUrl: null,
      },
      // === MURCIA ===
      {
        name: 'Bando de la Huerta',
        city: 'Murcia',
        description:
          'La fiesta más popular de Murcia, desfile de carrozas huertanas.',
        region: 'Murcia',
        festivalType: 'tradicional',
        startDate: new Date(2026, 3, 7),
        endDate: new Date(2026, 3, 7),
        latitude: 37.9922,
        longitude: -1.1307,
        imageUrl: null,
      },
      // === CANARIAS ===
      {
        name: 'Carnaval de Santa Cruz',
        city: 'Santa Cruz de Tenerife',
        description: 'El segundo carnaval más famoso del mundo tras el de Río.',
        region: 'Canarias',
        festivalType: 'tradicional',
        startDate: new Date(2026, 1, 13),
        endDate: new Date(2026, 2, 1),
        latitude: 28.4636,
        longitude: -16.2518,
        imageUrl: null,
      },
      {
        name: 'Carnaval de Las Palmas',
        city: 'Las Palmas de Gran Canaria',
        description:
          'Gala drag queen, murgas y comparsas en la capital grancanaria.',
        region: 'Canarias',
        festivalType: 'tradicional',
        startDate: new Date(2026, 1, 6),
        endDate: new Date(2026, 2, 1),
        latitude: 28.1235,
        longitude: -15.4363,
        imageUrl: null,
      },
      // === EXTREMADURA ===
      {
        name: 'WOMAD Cáceres',
        city: 'Cáceres',
        description:
          'Festival de músicas del mundo en el casco histórico medieval.',
        region: 'Extremadura',
        festivalType: 'musical',
        startDate: new Date(2026, 4, 7),
        endDate: new Date(2026, 4, 10),
        latitude: 39.4753,
        longitude: -6.3724,
        imageUrl: null,
      },
      // === CASTILLA-LA MANCHA ===
      {
        name: 'Corpus Christi de Toledo',
        city: 'Toledo',
        description:
          'Procesiones por las calles medievales con la custodia de Arfe.',
        region: 'Castilla-La Mancha',
        festivalType: 'religioso',
        startDate: new Date(2026, 5, 4),
        endDate: new Date(2026, 5, 4),
        latitude: 39.8628,
        longitude: -4.0273,
        imageUrl: null,
      },
      // === ASTURIAS ===
      {
        name: 'Descenso del Sella',
        city: 'Arriondas',
        description:
          'La fiesta de las piraguas más famosa de España, desde 1930.',
        region: 'Asturias',
        festivalType: 'tradicional',
        startDate: new Date(2026, 7, 1),
        endDate: new Date(2026, 7, 1),
        latitude: 43.3871,
        longitude: -5.1764,
        imageUrl: null,
      },
      // === LA RIOJA ===
      {
        name: 'Batalla del Vino',
        city: 'Haro',
        description:
          'Miles de personas se lanzan vino tinto en la montaña de Bilibio.',
        region: 'La Rioja',
        festivalType: 'tradicional',
        startDate: new Date(2026, 5, 29),
        endDate: new Date(2026, 5, 29),
        latitude: 42.5762,
        longitude: -2.8497,
        imageUrl: null,
      },
      // === BALEARES ===
      {
        name: 'Sant Joan de Ciutadella',
        city: 'Ciutadella',
        description:
          'Caballos, jinetes y multitud en las fiestas más espectaculares de Menorca.',
        region: 'Baleares',
        festivalType: 'tradicional',
        startDate: new Date(2026, 5, 23),
        endDate: new Date(2026, 5, 24),
        latitude: 40.0011,
        longitude: 3.8376,
        imageUrl: null,
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
