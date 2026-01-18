import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Get the user to check for existing avatar
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    // Delete old avatar if exists
    if (user?.avatar) {
      await this.storage.deleteFile(user.avatar);
    }

    // Upload new avatar to MinIO
    const avatarUrl = await this.storage.uploadFile(file, 'avatars');

    // Update user with new avatar URL
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    return avatarUrl;
  }

  async deleteAvatar(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (user?.avatar) {
      await this.storage.deleteFile(user.avatar);

      await this.prisma.user.update({
        where: { id: userId },
        data: { avatar: null },
      });
    }
  }

  async uploadExperiencePhotos(
    experienceId: string,
    userId: string,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron archivos');
    }

    // Verify experience exists and belongs to user
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      select: { hostId: true, photos: true },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    if (experience.hostId !== userId) {
      console.log('🚫 Permission denied for photo upload:');
      console.log('   Experience ID:', experienceId);
      console.log('   Experience hostId:', experience.hostId);
      console.log('   Current userId:', userId);
      throw new ForbiddenException(
        'No tienes permiso para modificar esta experiencia',
      );
    }

    const maxPhotos = 10;

    // Check total photos limit
    if (experience.photos.length + files.length > maxPhotos) {
      throw new BadRequestException(
        `Máximo ${maxPhotos} fotos por experiencia`,
      );
    }

    // Upload all files to MinIO
    const newPhotoUrls: string[] = [];
    for (const file of files) {
      const url = await this.storage.uploadFile(
        file,
        `experiences/${experienceId}`,
      );
      newPhotoUrls.push(url);
    }

    // Update experience with new photos
    const updatedPhotos = [...experience.photos, ...newPhotoUrls];

    await this.prisma.experience.update({
      where: { id: experienceId },
      data: { photos: updatedPhotos },
    });

    return newPhotoUrls;
  }

  async deleteExperiencePhoto(
    experienceId: string,
    userId: string,
    photoUrl: string,
  ): Promise<void> {
    console.log('🗑️ deleteExperiencePhoto called:', {
      experienceId,
      userId,
      photoUrl,
    });

    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      select: { hostId: true, photos: true },
    });

    if (!experience) {
      console.log('❌ Experience not found');
      throw new NotFoundException('Experiencia no encontrada');
    }

    if (experience.hostId !== userId) {
      console.log('❌ Permission denied:', {
        hostId: experience.hostId,
        userId,
      });
      throw new ForbiddenException(
        'No tienes permiso para modificar esta experiencia',
      );
    }

    console.log('📸 Current photos:', experience.photos);
    console.log('🔍 Looking for:', photoUrl);

    if (!experience.photos.includes(photoUrl)) {
      console.log('❌ Photo not found in array');
      throw new NotFoundException('Foto no encontrada en esta experiencia');
    }

    // Delete from MinIO (only for MinIO URLs)
    if (photoUrl.startsWith('http')) {
      await this.storage.deleteFile(photoUrl);
    }

    // Update experience photos
    const updatedPhotos = experience.photos.filter((p) => p !== photoUrl);
    console.log('✅ Updated photos:', updatedPhotos);

    await this.prisma.experience.update({
      where: { id: experienceId },
      data: { photos: updatedPhotos },
    });

    console.log('✅ Photo deleted successfully');
  }

  async reorderExperiencePhotos(
    experienceId: string,
    userId: string,
    photoUrls: string[],
  ): Promise<string[]> {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
      select: { hostId: true, photos: true },
    });

    if (!experience) {
      throw new NotFoundException('Experiencia no encontrada');
    }

    if (experience.hostId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta experiencia',
      );
    }

    // Verify all URLs are valid
    const existingSet = new Set(experience.photos);
    const newSet = new Set(photoUrls);

    if (existingSet.size !== newSet.size) {
      throw new BadRequestException('Lista de fotos inválida');
    }

    for (const url of photoUrls) {
      if (!existingSet.has(url)) {
        throw new BadRequestException('Lista de fotos inválida');
      }
    }

    await this.prisma.experience.update({
      where: { id: experienceId },
      data: { photos: photoUrls },
    });

    return photoUrls;
  }
}
