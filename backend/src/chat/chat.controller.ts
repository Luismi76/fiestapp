import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VoiceService } from './voice.service';
import { TranslationService } from './translation.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('chat')
export class ChatController {
  constructor(
    private voiceService: VoiceService,
    private translationService: TranslationService,
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  @Post('voice/:matchId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadVoice(
    @UploadedFile() file: Express.Multer.File,
    @Param('matchId') matchId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo de audio');
    }

    // Validar mimetype manualmente
    const validMimeTypes = [
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/mpeg',
      'audio/wav',
      'video/webm', // MediaRecorder puede usar esto para audio
    ];

    const isValidType =
      validMimeTypes.some((type) =>
        file.mimetype.startsWith(type.split('/')[0] + '/'),
      ) || file.mimetype === 'video/webm';

    if (!isValidType) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Tipos válidos: ${validMimeTypes.join(', ')}`,
      );
    }

    // Verificar que el usuario pertenece al match
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ requesterId: req.user.userId }, { hostId: req.user.userId }],
      },
    });

    if (!match) {
      throw new BadRequestException('Match no encontrado o no tienes acceso');
    }

    // Subir audio a Cloudinary
    const { url, duration } = await this.voiceService.uploadVoice(
      file,
      matchId,
      req.user.userId,
    );

    // Crear mensaje en la base de datos
    const message = await this.prisma.message.create({
      data: {
        matchId,
        senderId: req.user.userId,
        content: '', // Mensaje de voz no tiene contenido de texto
        type: 'VOICE',
        voiceUrl: url,
        voiceDuration: duration,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Emitir evento WebSocket para que el mensaje aparezca en el chat
    const otherUserId =
      match.hostId === req.user.userId ? match.requesterId : match.hostId;
    this.chatGateway.emitNewMessage(
      matchId,
      message,
      req.user.userId,
      otherUserId,
    );

    return {
      url,
      duration,
      message,
    };
  }

  @Post('translate/:messageId')
  @UseGuards(JwtAuthGuard)
  async translateMessage(
    @Param('messageId') messageId: string,
    @Body('targetLang') targetLang: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!targetLang) {
      targetLang = 'es'; // Default to Spanish
    }

    // Obtener el mensaje
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        match: true,
      },
    });

    if (!message) {
      throw new BadRequestException('Mensaje no encontrado');
    }

    // Verificar acceso
    if (
      message.match.requesterId !== req.user.userId &&
      message.match.hostId !== req.user.userId
    ) {
      throw new BadRequestException('No tienes acceso a este mensaje');
    }

    // No traducir mensajes de voz o ubicación
    if (message.type !== 'TEXT' && message.type !== 'QUICK_REPLY') {
      throw new BadRequestException(
        'Este tipo de mensaje no se puede traducir',
      );
    }

    // Verificar si ya tenemos la traducción en cache
    const translations = (message.translations as Record<string, string>) || {};
    if (translations[targetLang]) {
      return {
        translatedText: translations[targetLang],
        detectedLanguage: message.originalLang,
        cached: true,
      };
    }

    // Traducir
    const result = await this.translationService.translateText(
      message.content,
      targetLang,
    );

    // Guardar en cache
    const updatedTranslations = {
      ...translations,
      [targetLang]: result.translatedText,
    };

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        translations: updatedTranslations,
        originalLang: message.originalLang || result.detectedLanguage,
      },
    });

    return {
      translatedText: result.translatedText,
      detectedLanguage: result.detectedLanguage,
      cached: false,
    };
  }
}
