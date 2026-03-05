import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async create(dto: CreateEvaluationDto) {
    const evaluation = await this.prisma.evaluation.create({
      data: {
        evaluatorName: dto.evaluatorName,
        page: dto.page,
        category: dto.category,
        priority: dto.priority,
        comment: dto.comment,
        screenshotUrl: dto.screenshotUrl,
      },
    });

    // Notificar por email
    this.sendNotificationEmail(evaluation).catch((err) =>
      this.logger.error('Error enviando notificación de evaluación:', err),
    );

    return evaluation;
  }

  async findAll(filters?: {
    status?: string;
    category?: string;
    evaluatorName?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filters || {};
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};
    if (where.status) whereClause.status = where.status;
    if (where.category) whereClause.category = where.category;
    if (where.evaluatorName) {
      whereClause.evaluatorName = { contains: where.evaluatorName, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.evaluation.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.evaluation.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.evaluation.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateEvaluationDto) {
    return this.prisma.evaluation.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return this.prisma.evaluation.delete({ where: { id } });
  }

  async getStats() {
    const [total, byStatus, byCategory, byPriority] = await Promise.all([
      this.prisma.evaluation.count(),
      this.prisma.evaluation.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.evaluation.groupBy({
        by: ['category'],
        _count: true,
      }),
      this.prisma.evaluation.groupBy({
        by: ['priority'],
        _count: true,
      }),
    ]);

    return { total, byStatus, byCategory, byPriority };
  }

  private async sendNotificationEmail(evaluation: {
    evaluatorName: string;
    page: string;
    category: string;
    priority: string;
    comment: string;
  }) {
    const devEmail =
      this.configService.get<string>('DEV_EMAIL') || 'dev@fiestapp.com';

    const priorityColors: Record<string, string> = {
      BAJA: '#0D7355',
      MEDIA: '#E6A817',
      ALTA: '#C41E3A',
    };

    const categoryLabels: Record<string, string> = {
      PROBLEMA: 'Problema',
      MEJORA: 'Propuesta de mejora',
      OPINION: 'Opinion general',
    };

    const color = priorityColors[evaluation.priority] || '#8B7355';
    const categoryLabel = categoryLabels[evaluation.category] || evaluation.category;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1E5F8C 0%, #0D7355 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Evaluacion del Prototipo</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Nuevo feedback de evaluador</p>
        </div>
        <div style="padding: 32px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151; width: 120px;">Evaluador</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #6b7280;">${evaluation.evaluatorName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151;">Pagina</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-family: monospace;">${evaluation.page}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151;">Categoria</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #6b7280;">${categoryLabel}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #374151;">Prioridad</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; color: white; background: ${color};">${evaluation.priority}</span>
              </td>
            </tr>
          </table>
          <div style="margin-top: 24px; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid ${color};">
            <p style="margin: 0 0 8px; font-weight: 600; color: #374151;">Comentario:</p>
            <p style="margin: 0; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${evaluation.comment}</p>
          </div>
        </div>
        <div style="padding: 16px 32px; background: #f9fafb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">FiestApp - Sistema de evaluacion del prototipo</p>
        </div>
      </div>
    `;

    await this.emailService.sendGenericEmail(
      devEmail,
      `[Evaluacion] ${categoryLabel} (${evaluation.priority}) - ${evaluation.evaluatorName}`,
      html,
    );
  }
}
