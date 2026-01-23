import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Respuestas rápidas predeterminadas del sistema
export const DEFAULT_QUICK_REPLIES = [
  { text: '¡Hola!', emoji: '👋' },
  { text: 'Perfecto', emoji: '👍' },
  { text: 'De acuerdo', emoji: '✅' },
  { text: '¿Dónde quedamos?', emoji: '📍' },
  { text: 'Llego en 5 minutos', emoji: '🏃' },
  { text: '¿A qué hora?', emoji: '🕐' },
  { text: '¡Genial!', emoji: '🎉' },
  { text: 'Un momento', emoji: '⏳' },
  { text: 'Gracias', emoji: '🙏' },
  { text: '¡Nos vemos!', emoji: '👋' },
];

export interface QuickReply {
  id: string;
  text: string;
  emoji: string | null;
  sortOrder: number;
  isDefault?: boolean;
}

@Injectable()
export class QuickRepliesService {
  constructor(private prisma: PrismaService) {}

  async getQuickReplies(userId: string): Promise<QuickReply[]> {
    const userReplies = await this.prisma.quickReply.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        text: true,
        emoji: true,
        sortOrder: true,
      },
    });

    return userReplies;
  }

  async getDefaultReplies(): Promise<QuickReply[]> {
    return DEFAULT_QUICK_REPLIES.map((reply, index) => ({
      id: `default-${index}`,
      text: reply.text,
      emoji: reply.emoji,
      sortOrder: index,
      isDefault: true,
    }));
  }

  async getAllReplies(userId: string): Promise<{
    userReplies: QuickReply[];
    defaultReplies: QuickReply[];
  }> {
    const [userReplies, defaultReplies] = await Promise.all([
      this.getQuickReplies(userId),
      this.getDefaultReplies(),
    ]);

    return { userReplies, defaultReplies };
  }

  async createQuickReply(
    userId: string,
    text: string,
    emoji?: string,
  ): Promise<QuickReply> {
    // Obtener el siguiente sortOrder
    const lastReply = await this.prisma.quickReply.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = (lastReply?.sortOrder ?? -1) + 1;

    const reply = await this.prisma.quickReply.create({
      data: {
        userId,
        text: text.substring(0, 100), // Limitar longitud
        emoji: emoji?.substring(0, 10) || null,
        sortOrder,
      },
      select: {
        id: true,
        text: true,
        emoji: true,
        sortOrder: true,
      },
    });

    return reply;
  }

  async updateQuickReply(
    userId: string,
    replyId: string,
    data: { text?: string; emoji?: string | null; sortOrder?: number },
  ): Promise<QuickReply> {
    // Verificar que pertenece al usuario
    const existing = await this.prisma.quickReply.findFirst({
      where: { id: replyId, userId },
    });

    if (!existing) {
      throw new Error('Respuesta rápida no encontrada');
    }

    const reply = await this.prisma.quickReply.update({
      where: { id: replyId },
      data: {
        text: data.text?.substring(0, 100),
        emoji: data.emoji !== undefined ? data.emoji?.substring(0, 10) || null : existing.emoji,
        sortOrder: data.sortOrder ?? existing.sortOrder,
      },
      select: {
        id: true,
        text: true,
        emoji: true,
        sortOrder: true,
      },
    });

    return reply;
  }

  async deleteQuickReply(userId: string, replyId: string): Promise<void> {
    // Verificar que pertenece al usuario
    const existing = await this.prisma.quickReply.findFirst({
      where: { id: replyId, userId },
    });

    if (!existing) {
      throw new Error('Respuesta rápida no encontrada');
    }

    await this.prisma.quickReply.delete({
      where: { id: replyId },
    });
  }

  async reorderQuickReplies(
    userId: string,
    replyIds: string[],
  ): Promise<void> {
    // Actualizar sortOrder para cada respuesta
    await this.prisma.$transaction(
      replyIds.map((id, index) =>
        this.prisma.quickReply.updateMany({
          where: { id, userId },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
