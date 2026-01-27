import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
    this.logger.log('Cloudinary configured');
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `fiestapp/${folder}`,
            resource_type: 'image',
            // Optimización automática de imágenes
            quality: 'auto:good', // Calidad automática optimizada
            fetch_format: 'auto', // WebP/AVIF cuando el navegador lo soporte
            flags: 'progressive', // JPEG progresivo
            // Transformaciones para optimizar tamaño
            transformation: [
              {
                width: 1920,
                height: 1920,
                crop: 'limit', // No aumentar, solo reducir si es mayor
              },
            ],
            // Generar versiones eager (thumbnails)
            eager: [
              { width: 400, height: 400, crop: 'fill', quality: 'auto:low' },
              { width: 800, height: 600, crop: 'fill', quality: 'auto:good' },
            ],
            eager_async: true,
          },
          (error: unknown, result: UploadApiResponse | undefined) => {
            if (error) {
              let errorMessage: string;
              if (error instanceof Error) {
                errorMessage = error.message;
              } else if (typeof error === 'object' && error !== null) {
                errorMessage = JSON.stringify(error);
              } else {
                errorMessage = String(error as string | number | boolean);
              }
              this.logger.error('Error uploading to Cloudinary', errorMessage);
              reject(new Error(errorMessage));
            } else if (result) {
              resolve(result.secure_url);
            } else {
              reject(new Error('No result from Cloudinary'));
            }
          },
        )
        .end(file.buffer);
    });
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123/folder/filename.ext
      const urlParts = fileUrl.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex === -1) return;

      // Get everything after 'upload/vXXX/' and remove extension
      const pathParts = urlParts.slice(uploadIndex + 2);
      const publicId = pathParts.join('/').replace(/\.[^/.]+$/, '');

      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
        this.logger.debug(`Deleted from Cloudinary: ${publicId}`);
      }
    } catch (error) {
      this.logger.error(
        'Error deleting file from Cloudinary',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  getPublicUrl(key: string): string {
    // For Cloudinary, we return the full URL directly from upload
    return key;
  }
}
