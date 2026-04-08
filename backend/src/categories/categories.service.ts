import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Siempre ejecutar upsert para asegurar que todas las categorías existen
    // (la migración solo creó las 6 locales, faltan las de fiesta)
    this.logger.log('Verificando categorías...');
    await this.seed();
  }

  async seed() {
    const categories = [
      // Fiestas populares
      {
        name: 'Feria',
        slug: 'feria',
        group: 'fiesta',
        icon: '🎪',
        sortOrder: 1,
      },
      {
        name: 'Romería',
        slug: 'romeria',
        group: 'fiesta',
        icon: '⛪',
        sortOrder: 2,
      },
      {
        name: 'Procesión',
        slug: 'procesion',
        group: 'fiesta',
        icon: '🕯️',
        sortOrder: 3,
      },
      {
        name: 'Carnaval',
        slug: 'carnaval',
        group: 'fiesta',
        icon: '🎭',
        sortOrder: 4,
      },
      {
        name: 'Verbena / Fiesta patronal',
        slug: 'verbena',
        group: 'fiesta',
        icon: '🎆',
        sortOrder: 5,
      },
      {
        name: 'Encierro / Fiesta taurina',
        slug: 'encierro',
        group: 'fiesta',
        icon: '🐂',
        sortOrder: 6,
      },
      {
        name: 'Festival / Concierto',
        slug: 'festival',
        group: 'fiesta',
        icon: '🎵',
        sortOrder: 7,
      },
      // Experiencias locales
      {
        name: 'Gastronomía / Tapas',
        slug: 'gastronomia',
        group: 'local',
        icon: '🍷',
        sortOrder: 1,
      },
      {
        name: 'Cultura / Historia',
        slug: 'cultura',
        group: 'local',
        icon: '🏛️',
        sortOrder: 2,
      },
      {
        name: 'Naturaleza / Senderismo',
        slug: 'naturaleza',
        group: 'local',
        icon: '🥾',
        sortOrder: 3,
      },
      {
        name: 'Aventura',
        slug: 'aventura',
        group: 'local',
        icon: '⛰️',
        sortOrder: 4,
      },
      {
        name: 'Vida nocturna',
        slug: 'nocturna',
        group: 'local',
        icon: '🌙',
        sortOrder: 5,
      },
      {
        name: 'Familiar',
        slug: 'familiar',
        group: 'local',
        icon: '👨‍👩‍👧',
        sortOrder: 6,
      },
    ];

    for (const cat of categories) {
      await this.prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: cat,
      });
    }

    this.logger.log(`Seed completado: ${categories.length} categorías creadas`);
  }

  async findAll(group?: string) {
    const where: Record<string, unknown> = { active: true };
    if (group) {
      where.group = group;
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findAllAdmin() {
    return this.prisma.category.findMany({
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
      include: {
        _count: { select: { experiences: true } },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una categoría con slug "${dto.slug}"`,
      );
    }

    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.category.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe una categoría con slug "${dto.slug}"`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async toggleActive(id: string) {
    const category = await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: { active: !category.active },
    });
  }
}
