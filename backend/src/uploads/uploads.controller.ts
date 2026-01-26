import {
  Controller,
  Post,
  Delete,
  Put,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request as ExpressRequest } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

type MulterCallback = (error: Error | null, acceptFile: boolean) => void;

const imageFileFilter = (
  _req: ExpressRequest,
  file: Express.Multer.File,
  callback: MulterCallback,
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new Error('Tipo de archivo no permitido. Use JPG, PNG, WebP o GIF'),
      false,
    );
  }
};

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    const avatarUrl = await this.uploadsService.uploadAvatar(
      req.user.userId,
      file,
    );
    return { avatar: avatarUrl };
  }

  @Delete('avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAvatar(@Request() req: AuthenticatedRequest) {
    await this.uploadsService.deleteAvatar(req.user.userId);
  }

  @Post('experiences/:id/photos')
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadExperiencePhotos(
    @Param('id') experienceId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: AuthenticatedRequest,
  ) {
    const photoUrls = await this.uploadsService.uploadExperiencePhotos(
      experienceId,
      req.user.userId,
      files,
    );
    return { photos: photoUrls };
  }

  @Delete('experiences/:id/photos')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExperiencePhoto(
    @Param('id') experienceId: string,
    @Body('photoUrl') photoUrl: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.uploadsService.deleteExperiencePhoto(
      experienceId,
      req.user.userId,
      photoUrl,
    );
  }

  @Put('experiences/:id/photos/reorder')
  async reorderExperiencePhotos(
    @Param('id') experienceId: string,
    @Body('photos') photos: string[],
    @Request() req: AuthenticatedRequest,
  ) {
    const reorderedPhotos = await this.uploadsService.reorderExperiencePhotos(
      experienceId,
      req.user.userId,
      photos,
    );
    return { photos: reorderedPhotos };
  }
}
