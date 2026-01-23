import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { FinancialReportService } from './financial-report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly financialReportService: FinancialReportService,
  ) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('experiences')
  getExperiences(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'all' | 'published' | 'draft',
  ) {
    return this.adminService.getExperiences(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Post('experiences/:id/toggle-published')
  toggleExperiencePublished(@Param('id') id: string) {
    return this.adminService.toggleExperiencePublished(id);
  }

  @Post('users/:id/role')
  setUserRole(@Param('id') id: string, @Body('role') role: 'user' | 'admin') {
    return this.adminService.setUserRole(id, role);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Delete('experiences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteExperience(@Param('id') id: string) {
    return this.adminService.deleteExperience(id);
  }

  @Post('users/:id/impersonate')
  impersonateUser(@Param('id') id: string) {
    return this.adminService.impersonateUser(id);
  }

  // ============================================
  // Sistema de Strikes y Bans
  // ============================================

  @Post('users/:id/strike')
  addStrike(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.addStrike(id, reason);
  }

  @Delete('users/:id/strike')
  removeStrike(@Param('id') id: string) {
    return this.adminService.removeStrike(id);
  }

  @Post('users/:id/ban')
  banUser(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.banUser(id, reason);
  }

  @Post('users/:id/unban')
  unbanUser(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Get('users/banned')
  getBannedUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getBannedUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('users/strikes')
  getUsersWithStrikes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsersWithStrikes(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ============================================
  // Reportes Financieros
  // ============================================

  @Get('reports/financial/summary')
  getFinancialSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportService.getFinancialSummary({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('reports/financial/revenue')
  getRevenueByPeriod(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportService.getRevenueByPeriod(period, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('reports/financial/transactions')
  getTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.financialReportService.getTransactions(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        type,
        status,
      },
    );
  }

  @Get('reports/financial/export')
  async exportFinancialReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.financialReportService.exportToCSV({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return { csv };
  }

  @Get('reports/financial/wallets')
  getWalletStats() {
    return this.financialReportService.getWalletStats();
  }

  @Get('reports/financial/commissions')
  getCommissionMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialReportService.getCommissionMetrics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // ============================================
  // Dashboard Mejorado - Graficas
  // ============================================

  @Get('charts/users')
  getUsersChartData(@Query('months') months?: string) {
    return this.adminService.getUsersChartData(months ? parseInt(months) : 12);
  }

  @Get('charts/revenue')
  getRevenueChartData(@Query('months') months?: string) {
    return this.adminService.getRevenueChartData(
      months ? parseInt(months) : 12,
    );
  }

  @Get('stats/matches')
  getMatchesStats() {
    return this.adminService.getMatchesStats();
  }

  @Get('stats/conversion')
  getConversionStats() {
    return this.adminService.getConversionStats();
  }

  @Get('stats/active-users')
  getActiveUsers(@Query('days') days?: string) {
    return this.adminService.getActiveUsers(days ? parseInt(days) : 7);
  }

  @Get('top/experiences')
  getTopExperiences(@Query('limit') limit?: string) {
    return this.adminService.getTopExperiences(limit ? parseInt(limit) : 10);
  }

  @Get('top/hosts')
  getTopHosts(@Query('limit') limit?: string) {
    return this.adminService.getTopHosts(limit ? parseInt(limit) : 10);
  }

  // ============================================
  // Gestion Avanzada de Usuarios
  // ============================================

  @Get('users/advanced')
  getUsersAdvanced(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('verified') verified?: string,
    @Query('banned') banned?: string,
    @Query('hasStrikes') hasStrikes?: string,
    @Query('role') role?: 'user' | 'admin',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('orderBy')
    orderBy?: 'createdAt' | 'name' | 'email' | 'matches' | 'revenue',
    @Query('orderDir') orderDir?: 'asc' | 'desc',
  ) {
    return this.adminService.getUsersAdvanced(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      {
        search,
        verified: verified ? verified === 'true' : undefined,
        banned: banned ? banned === 'true' : undefined,
        hasStrikes: hasStrikes === 'true',
        role,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        orderBy,
        orderDir,
      },
    );
  }

  @Get('users/:id/detail')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Get('users/export/csv')
  async exportUsersToCsv(
    @Res() res: Response,
    @Query('verified') verified?: string,
    @Query('banned') banned?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const csv = await this.adminService.exportUsersToCSV({
      verified: verified ? verified === 'true' : undefined,
      banned: banned ? banned === 'true' : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  }

  @Post('users/bulk/verify')
  bulkVerifyUsers(@Body('userIds') userIds: string[]) {
    return this.adminService.bulkVerifyUsers(userIds);
  }

  @Post('users/bulk/ban')
  bulkBanUsers(
    @Body('userIds') userIds: string[],
    @Body('reason') reason: string,
  ) {
    return this.adminService.bulkBanUsers(userIds, reason);
  }
}
