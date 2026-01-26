import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  CreateVerificationDto,
  AdminReviewVerificationDto,
  VerificationStatus,
} from './dto/verification.dto';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role?: string;
  };
}

@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  // ========== User Endpoints ==========

  /**
   * Get current user's verification status
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyVerification(@Request() req: RequestWithUser) {
    return this.verificationService.getMyVerification(req.user.userId);
  }

  /**
   * Submit a new verification request
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createVerification(
    @Request() req: RequestWithUser,
    @Body() dto: CreateVerificationDto,
  ) {
    return this.verificationService.createVerification(req.user.userId, dto);
  }

  // ========== Admin Endpoints ==========

  /**
   * Get all verifications (admin)
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getVerifications(
    @Query('status') status?: VerificationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.verificationService.getVerifications(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Get verification statistics (admin)
   */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getVerificationStats() {
    return this.verificationService.getVerificationStats();
  }

  /**
   * Get verification details (admin)
   */
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getVerificationById(@Param('id') id: string) {
    return this.verificationService.getVerificationById(id);
  }

  /**
   * Review (approve/reject) a verification (admin)
   */
  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async reviewVerification(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() dto: AdminReviewVerificationDto,
  ) {
    return this.verificationService.reviewVerification(
      id,
      req.user.userId,
      dto,
    );
  }
}
