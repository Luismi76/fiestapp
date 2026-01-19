import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFestivalDto } from './dto/create-festival.dto';

@Injectable()
export class FestivalsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
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
  }

  async create(createFestivalDto: CreateFestivalDto) {
    // Verificar si ya existe una festividad con el mismo nombre
    const existing = await this.prisma.festival.findUnique({
      where: { name: createFestivalDto.name },
    });

    if (existing) {
      throw new ConflictException('Ya existe una festividad con este nombre');
    }

    return this.prisma.festival.create({
      data: {
        name: createFestivalDto.name,
        city: createFestivalDto.city,
        description: createFestivalDto.description,
        imageUrl: createFestivalDto.imageUrl,
      },
    });
  }

  async findOne(id: string) {
    const festival = await this.prisma.festival.findUnique({
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

    if (!festival) {
      throw new NotFoundException('Festival no encontrado');
    }

    return festival;
  }

  async seed() {
    const festivals = [
      {
        name: 'Feria de Abril',
        city: 'Sevilla',
        description:
          'La feria más emblemática de Andalucía con casetas, flamenco y tradición.',
        imageUrl: null,
      },
      {
        name: 'San Fermín',
        city: 'Pamplona',
        description:
          'Los famosos encierros y las fiestas más internacionales de España.',
        imageUrl: null,
      },
      {
        name: 'Las Fallas',
        city: 'Valencia',
        description:
          'Arte efímero, pólvora y tradición valenciana en estado puro.',
        imageUrl: null,
      },
      {
        name: 'La Tomatina',
        city: 'Buñol',
        description: 'La batalla de tomates más grande del mundo.',
        imageUrl: null,
      },
      {
        name: 'Semana Grande',
        city: 'Bilbao',
        description: 'Nueve días de fiesta, conciertos y tradición vasca.',
        imageUrl: null,
      },
      {
        name: 'Carnaval de Cádiz',
        city: 'Cádiz',
        description: 'Humor, chirigotas y el carnaval más auténtico de España.',
        imageUrl: null,
      },
      {
        name: 'Semana Santa',
        city: 'Sevilla',
        description: 'Procesiones, cofradías y fervor religioso en las calles.',
        imageUrl: null,
      },
      {
        name: 'Feria de Málaga',
        city: 'Málaga',
        description: 'Una semana de fiesta, vino dulce y alegría malagueña.',
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

    return {
      message: 'Festivales creados correctamente',
      count: festivals.length,
    };
  }
}
