import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

const MAX_VOICE_DURATION_SECONDS = 60;

@Injectable()
export class VoiceService {
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
    }
  }

  async uploadVoice(
    file: Express.Multer.File,
    matchId: string,
    userId: string,
  ): Promise<{ url: string; duration: number }> {
    // Verificar que Cloudinary está configurado
    if (!this.isConfigured) {
      throw new BadRequestException(
        'Cloudinary no está configurado. Añade CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET al archivo .env'
      );
    }

    // Validar que es un archivo de audio (webm también contiene audio del micrófono)
    if (!file.mimetype.startsWith('audio/') && file.mimetype !== 'video/webm') {
      throw new BadRequestException('El archivo debe ser de audio');
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('El archivo es demasiado grande (máximo 5MB)');
    }

    try {
      // Subir a Cloudinary
      const result = await new Promise<{
        secure_url: string;
        duration: number;
      }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: 'video', // Cloudinary usa 'video' para audio
              folder: `fiestapp/chat/${matchId}`,
              public_id: `voice_${userId}_${Date.now()}`,
              format: 'mp3',
              transformation: [
                { audio_codec: 'mp3', audio_frequency: 22050 }, // Optimizar audio
              ],
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else if (result) {
                resolve({
                  secure_url: result.secure_url,
                  duration: result.duration || 0,
                });
              } else {
                reject(new Error('No result from Cloudinary'));
              }
            },
          )
          .end(file.buffer);
      });

      // Validar duración
      if (result.duration > MAX_VOICE_DURATION_SECONDS) {
        // Eliminar el archivo si es demasiado largo
        // No es crítico si falla la eliminación
        throw new BadRequestException(
          `El mensaje de voz es demasiado largo (máximo ${MAX_VOICE_DURATION_SECONDS} segundos)`,
        );
      }

      return {
        url: result.secure_url,
        duration: Math.round(result.duration),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error uploading voice to Cloudinary:', error instanceof Error ? error.message : error);
      throw new BadRequestException('Error al subir el mensaje de voz');
    }
  }

  async deleteVoice(url: string): Promise<void> {
    try {
      // Extraer public_id de la URL
      const publicIdMatch = url.match(/fiestapp\/chat\/[^/]+\/voice_[^.]+/);
      if (publicIdMatch) {
        await cloudinary.uploader.destroy(publicIdMatch[0], {
          resource_type: 'video',
        });
      }
    } catch (error) {
      console.error('Error deleting voice message:', error);
      // No lanzamos error, es una operación de limpieza
    }
  }
}
