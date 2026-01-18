import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private s3Client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT') || 'http://localhost:9000';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin';
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin';

    this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'fiestapp';
    this.publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL') || endpoint;

    this.s3Client = new S3Client({
      endpoint,
      region: 'us-east-1', // MinIO ignores this but it's required
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      console.log(`✅ Bucket '${this.bucket}' exists`);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log(`📦 Creating bucket '${this.bucket}'...`);
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          console.log(`✅ Bucket '${this.bucket}' created`);
        } catch (createError: any) {
          // Bucket already exists (created by another process or already owned)
          if (createError.name === 'BucketAlreadyOwnedByYou' || createError.name === 'BucketAlreadyExists') {
            console.log(`✅ Bucket '${this.bucket}' already exists`);
          } else {
            console.error('Error creating bucket:', createError);
          }
        }
      } else {
        console.error('Error checking bucket:', error);
      }
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const fileExtension = extname(file.originalname);
    const fileName = `${folder}/${uuidv4()}${fileExtension}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    // Return the public URL
    return `${this.publicUrl}/${this.bucket}/${fileName}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the key from the URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      // Remove empty string and bucket name
      const key = pathParts.slice(2).join('/');

      if (key) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        );
      }
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }
}
