import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class StorageService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
    console.log('✅ Cloudinary configured');
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `fiestapp/${folder}`,
            resource_type: 'image',
          },
          (error, result: UploadApiResponse | undefined) => {
            if (error) {
              console.error('Error uploading to Cloudinary:', error);
              reject(error);
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
        console.log(`✅ Deleted from Cloudinary: ${publicId}`);
      }
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
    }
  }

  getPublicUrl(key: string): string {
    // For Cloudinary, we return the full URL directly from upload
    return key;
  }
}
