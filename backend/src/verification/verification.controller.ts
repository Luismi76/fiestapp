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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyVerification(@Request() req: RequestWithUser) {
    return this.verificationService.getMyVerification(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createVerification(
    @Request() req: RequestWithUser,
    @Body() dto: CreateVerificationDto,
  ) {
    return this.verificationService.createVerification(req.user.userId, dto);
  }

  // ========== Admin Endpoints ==========

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

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getVerificationStats() {
    return this.verificationService.getVerificationStats();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getVerificationById(@Param('id') id: string) {
    return this.verificationService.getVerificationById(id);
  }

  /**
   * Verificar/desverificar un usuario manualmente
   */
  @Put('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async toggleVerification(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: { verified: boolean },
  ) {
    return this.verificationService.toggleVerification(
      id,
      req.user.userId,
      body.verified,
    );
  }

  /**
   * Revisar verificación documental (aprobar/rechazar)
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
