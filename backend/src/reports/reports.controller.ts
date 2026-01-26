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
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

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

  // ============================================
  // Gestion de Reportes Mejorada
  // ============================================

  /**
   * GET /api/reports/admin/advanced
   * Obtiene reportes con filtros avanzados
   */
  @Get('admin/advanced')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getReportsAdvanced(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('reportedType') reportedType?: string,
    @Query('reason') reason?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('priority') priority?: 'low' | 'medium' | 'high',
  ) {
    return this.reportsService.getReportsAdvanced(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      {
        status,
        reportedType,
        reason,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        priority,
      },
    );
  }

  /**
   * GET /api/reports/admin/:id/detail
   * Obtiene detalle completo de un reporte con contexto
   */
  @Get('admin/:id/detail')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getReportDetail(@Param('id') id: string) {
    return this.reportsService.getReportDetail(id);
  }

  /**
   * POST /api/reports/admin/:id/resolve
   * Resuelve un reporte con accion y notificacion
   */
  @Post('admin/:id/resolve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  resolveReport(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      status: 'resolved' | 'dismissed';
      action?: 'none' | 'warning' | 'strike' | 'ban' | 'remove_content';
      templateKey?: string;
      customMessage?: string;
      adminNotes?: string;
    },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.reportsService.resolveReport(id, req.user.userId, body as any);
  }

  /**
   * GET /api/reports/admin/templates
   * Obtiene templates de respuesta disponibles
   */
  @Get('admin/templates')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getResponseTemplates() {
    return this.reportsService.getResponseTemplates();
  }

  /**
   * GET /api/reports/admin/stats/advanced
   * Obtiene estadisticas avanzadas de reportes
   */
  @Get('admin/stats/advanced')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAdvancedStats(@Query('days') days?: string) {
    return this.reportsService.getAdvancedStats(days ? parseInt(days) : 30);
  }
}
