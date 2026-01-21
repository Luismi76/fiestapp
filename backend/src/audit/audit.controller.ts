import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/admin/audit/logs
   * Obtiene logs de auditoria con filtros
   */
  @Get('logs')
  getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.getLogs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      {
        userId,
        action,
        entity,
        entityId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      },
    );
  }

  /**
   * GET /api/admin/audit/stats
   * Obtiene estadisticas de auditoria
   */
  @Get('stats')
  getStats(@Query('days') days?: string) {
    return this.auditService.getStats(days ? parseInt(days) : 30);
  }

  /**
   * GET /api/admin/audit/users/:userId
   * Obtiene logs de un usuario especifico
   */
  @Get('users/:userId')
  getUserLogs(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getUserLogs(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * GET /api/admin/audit/entity/:entity/:entityId
   * Obtiene logs de una entidad especifica
   */
  @Get('entity/:entity/:entityId')
  getEntityLogs(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getEntityLogs(
      entity,
      entityId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * GET /api/admin/audit/actions
   * Obtiene tipos de acciones disponibles
   */
  @Get('actions')
  getActionTypes() {
    return this.auditService.getActionTypes();
  }

  /**
   * GET /api/admin/audit/entities
   * Obtiene tipos de entidades disponibles
   */
  @Get('entities')
  getEntityTypes() {
    return this.auditService.getEntityTypes();
  }

  /**
   * DELETE /api/admin/audit/cleanup
   * Elimina logs antiguos (mantiene ultimos 90 dias por defecto)
   */
  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  deleteOldLogs(@Query('daysToKeep') daysToKeep?: string) {
    return this.auditService.deleteOldLogs(daysToKeep ? parseInt(daysToKeep) : 90);
  }
}
