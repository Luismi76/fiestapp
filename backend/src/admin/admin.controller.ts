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
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { FinancialReportService } from './financial-report.service';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PlatformConfigService } from '../platform-config/platform-config.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly financialReportService: FinancialReportService,
    private readonly accountingService: AccountingService,
    private readonly configService: ConfigService,
    private readonly platformConfigService: PlatformConfigService,
  ) {}

  @Get('platform-config')
  async getPlatformConfig() {
    const configs = await this.platformConfigService.getAll();
    return { data: configs };
  }

  @Post('platform-config')
  async updatePlatformConfig(
    @Body() body: { entries: { key: string; value: string }[] },
  ) {
    const updated = await this.platformConfigService.updateMany(body.entries);
    return { data: updated };
  }

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/alerts')
  getDashboardAlerts() {
    return this.adminService.getDashboardAlerts();
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
  async impersonateUser(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminService.impersonateUser(id);
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return result;
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

  @Post('festivals/:id/cancel')
  cancelFestival(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.cancelFestival(id, reason);
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

  @Get('reports/financial/match/:matchId/timeline')
  getMatchTimeline(@Param('matchId') matchId: string) {
    return this.financialReportService.getMatchTimeline(matchId);
  }

  @Get('reports/financial/export')
  async exportFinancialReport(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.financialReportService.exportToCSV({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=financial_report.csv',
    );
    res.send('\uFEFF' + csv);
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

  // ============================================
  // Contabilidad
  // ============================================

  @Get('accounting/dashboard')
  getAccountingDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.accountingService.getAccountingDashboard(
      startDate,
      endDate,
      granularity,
    );
  }

  @Get('accounting/dac7')
  getDac7Report(@Query('year') year: string) {
    return this.accountingService.getDac7Report(
      parseInt(year) || new Date().getFullYear(),
    );
  }

  @Get('accounting/modelo347')
  getModelo347Report(@Query('year') year: string) {
    return this.accountingService.getModelo347Report(
      parseInt(year) || new Date().getFullYear(),
    );
  }

  @Get('accounting/vat-summary')
  getVatSummary(
    @Query('year') year: string,
    @Query('quarter') quarter?: string,
  ) {
    return this.accountingService.getVatSummary(
      parseInt(year) || new Date().getFullYear(),
      quarter ? parseInt(quarter) : undefined,
    );
  }

  @Get('accounting/export/dac7')
  async exportDac7(@Query('year') year: string, @Res() res: Response) {
    const csv = await this.accountingService.exportDac7Csv(
      parseInt(year) || new Date().getFullYear(),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=dac7_${year}.csv`,
    );
    res.send('\uFEFF' + csv);
  }

  @Get('accounting/export/vat-summary')
  async exportVatSummary(
    @Query('year') year: string,
    @Res() res: Response,
    @Query('quarter') quarter?: string,
  ) {
    const q = quarter ? parseInt(quarter) : undefined;
    const csv = await this.accountingService.exportVatSummaryCsv(
      parseInt(year) || new Date().getFullYear(),
      q && q >= 1 && q <= 4 ? q : undefined,
    );
    const filename = quarter
      ? `vat_summary_${year}_Q${quarter}.csv`
      : `vat_summary_${year}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}`,
    );
    res.send('\uFEFF' + csv);
  }

  @Get('accounting/export/modelo347')
  async exportModelo347(@Query('year') year: string, @Res() res: Response) {
    const csv = await this.accountingService.exportModelo347Csv(
      parseInt(year) || new Date().getFullYear(),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=modelo347_${year}.csv`,
    );
    res.send('\uFEFF' + csv);
  }

  // ============================================
  // Cuenta de Resultados (P&L)
  // ============================================

  @Get('accounting/pnl')
  getProfitAndLoss(
    @Query('year') year: string,
    @Query('quarter') quarter?: string,
  ) {
    return this.accountingService.getProfitAndLoss(
      parseInt(year) || new Date().getFullYear(),
      quarter ? parseInt(quarter) : undefined,
    );
  }

  @Get('accounting/export/pnl')
  async exportPnl(@Query('year') year: string, @Res() res: Response) {
    const csv = await this.accountingService.exportPnlCsv(
      parseInt(year) || new Date().getFullYear(),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=pnl_${year}.csv`,
    );
    res.send('\uFEFF' + csv);
  }
}
