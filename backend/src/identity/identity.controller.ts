import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request as ExpressRequest } from 'express';
import { IdentityService } from './identity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { StorageService } from '../storage/storage.service';

interface AuthenticatedUser {
  userId: string;
  email: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@Controller('identity')
export class IdentityController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly storageService: StorageService,
  ) {}

  // Get my verification status
  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@Request() req: AuthenticatedRequest) {
    return this.identityService.getVerificationStatus(req.user.userId);
  }

  // Submit verification documents
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'document', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
    ]),
  )
  async submitVerification(
    @Request() req: AuthenticatedRequest,
    @UploadedFiles()
    files: { document?: Express.Multer.File[]; selfie?: Express.Multer.File[] },
  ) {
    if (!files.document?.[0] || !files.selfie?.[0]) {
      throw new Error('Se requiere documento de identidad y selfie');
    }

    // Upload files to storage
    const documentPath = await this.storageService.uploadFile(
      files.document[0],
      `identity/${req.user.userId}`,
    );
    const selfiePath = await this.storageService.uploadFile(
      files.selfie[0],
      `identity/${req.user.userId}`,
    );

    return this.identityService.submitVerification(
      req.user.userId,
      documentPath,
      selfiePath,
    );
  }

  // Admin routes
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getPendingVerifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.identityService.getPendingVerifications(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getStats() {
    return this.identityService.getStats();
  }

  @Post('admin/:userId/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  approveVerification(@Param('userId') userId: string) {
    return this.identityService.approveVerification(userId);
  }

  @Post('admin/:userId/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  rejectVerification(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.identityService.rejectVerification(userId, reason);
  }
}
