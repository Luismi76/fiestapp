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
import { Request as ExpressRequest } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

interface AuthenticatedUser {
  userId: string;
  email: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Create a report (authenticated user)
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createReportDto: CreateReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reportsService.create(req.user.userId, createReportDto);
  }

  // Get my reports (authenticated user)
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyReports(@Request() req: AuthenticatedRequest) {
    return this.reportsService.getMyReports(req.user.userId);
  }

  // Admin routes
  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAllReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  ) {
    return this.reportsService.getAllReports(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getStats() {
    return this.reportsService.getStats();
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'reviewed' | 'resolved' | 'dismissed',
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.reportsService.updateStatus(id, status, adminNotes);
  }
}
