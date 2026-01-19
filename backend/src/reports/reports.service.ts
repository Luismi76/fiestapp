import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createReportDto: CreateReportDto) {
    const { reportedType, reportedId, reason, description } = createReportDto;

    // Validate the reported entity exists
    if (reportedType === 'user') {
      const user = await this.prisma.user.findUnique({
        where: { id: reportedId },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      if (user.id === userId)
        throw new BadRequestException('No puedes reportarte a ti mismo');
    } else if (reportedType === 'experience') {
      const exp = await this.prisma.experience.findUnique({
        where: { id: reportedId },
      });
      if (!exp) throw new NotFoundException('Experiencia no encontrada');
    } else if (reportedType === 'match') {
      const match = await this.prisma.match.findFirst({
        where: {
          id: reportedId,
          OR: [{ hostId: userId }, { requesterId: userId }],
        },
      });
      if (!match)
        throw new NotFoundException('Match no encontrado o no tienes acceso');
    }

    // Check for duplicate reports
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId: userId,
        reportedType,
        reportedId,
        status: { in: ['pending', 'reviewed'] },
      },
    });

    if (existingReport) {
      throw new BadRequestException('Ya has reportado este elemento');
    }

    return this.prisma.report.create({
      data: {
        reporterId: userId,
        reportedType,
        reportedId,
        reason,
        description,
      },
    });
  }

  // User's own reports
  async getMyReports(userId: string) {
    return this.prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin methods
  async getAllReports(
    page = 1,
    limit = 20,
    status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  ) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    // Enrich with reported entity info
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        let reportedEntity: unknown = null;

        if (report.reportedType === 'user') {
          reportedEntity = await this.prisma.user.findUnique({
            where: { id: report.reportedId },
            select: { id: true, name: true, email: true },
          });
        } else if (report.reportedType === 'experience') {
          reportedEntity = await this.prisma.experience.findUnique({
            where: { id: report.reportedId },
            select: { id: true, title: true, city: true },
          });
        } else if (report.reportedType === 'match') {
          reportedEntity = await this.prisma.match.findUnique({
            where: { id: report.reportedId },
            select: {
              id: true,
              status: true,
              experience: { select: { title: true } },
            },
          });
        }

        return { ...report, reportedEntity };
      }),
    );

    return {
      reports: enrichedReports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(
    reportId: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    adminNotes?: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Reporte no encontrado');

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        adminNotes,
        resolvedAt: ['resolved', 'dismissed'].includes(status)
          ? new Date()
          : null,
      },
    });
  }

  async getStats() {
    const [pending, reviewed, resolved, dismissed, total] = await Promise.all([
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.report.count({ where: { status: 'reviewed' } }),
      this.prisma.report.count({ where: { status: 'resolved' } }),
      this.prisma.report.count({ where: { status: 'dismissed' } }),
      this.prisma.report.count(),
    ]);

    return { pending, reviewed, resolved, dismissed, total };
  }
}
