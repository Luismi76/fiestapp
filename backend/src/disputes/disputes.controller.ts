import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { DisputesService } from './disputes.service';
import {
  CreateDisputeDto,
  AddDisputeMessageDto,
  ResolveDisputeDto,
} from './dto/create-dispute.dto';

interface AuthenticatedRequest {
  user: { sub: string; userId: string };
}

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  /**
   * Abrir una nueva disputa
   */
  @Post()
  openDispute(
    @Body() dto: CreateDisputeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.disputesService.openDispute(
      req.user.userId || req.user.sub,
      dto,
    );
  }

  /**
   * Obtener mis disputas
   */
  @Get()
  getMyDisputes(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    return this.disputesService.getUserDisputes(
      req.user.userId || req.user.sub,
      status,
    );
  }

  /**
   * Verificar si hay una disputa activa para un match
   */
  @Get('match/:matchId/active')
  getActiveDisputeForMatch(
    @Param('matchId') matchId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.disputesService.getActiveDisputeForMatch(
      req.user.userId || req.user.sub,
      matchId,
    );
  }

  /**
   * Obtener detalle de una disputa
   */
  @Get(':id')
  getDisputeDetail(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.disputesService.getDisputeDetail(
      req.user.userId || req.user.sub,
      id,
    );
  }

  /**
   * Añadir mensaje a una disputa
   */
  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() dto: AddDisputeMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.disputesService.addMessage(
      req.user.userId || req.user.sub,
      id,
      dto,
    );
  }
}

@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDisputesController {
  constructor(private disputesService: DisputesService) {}

  /**
   * Obtener todas las disputas (admin) con filtros avanzados
   */
  @Get()
  getAllDisputes(
    @Query('status') status?: string,
    @Query('reason') reason?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.disputesService.getAllDisputes({
      status,
      reason,
      search,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Obtener estadísticas de disputas (admin)
   */
  @Get('stats')
  getStats() {
    return this.disputesService.getDisputeStats();
  }

  /**
   * Exportar disputas como CSV (admin)
   */
  @Get('export/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('reason') reason?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const csv = await this.disputesService.exportDisputesCsv({
      status,
      reason,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="disputas-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  /**
   * Obtener detalle de una disputa (admin)
   */
  @Get(':id')
  getDisputeDetail(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.disputesService.getDisputeDetail(
      req.user.userId || req.user.sub,
      id,
    );
  }

  /**
   * Marcar disputa como en revisión (admin)
   */
  @Patch(':id/review')
  markUnderReview(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.disputesService.markUnderReview(
      req.user.userId || req.user.sub,
      id,
    );
  }

  /**
   * Resolver una disputa (admin)
   */
  @Patch(':id/resolve')
  resolveDispute(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.disputesService.resolveDispute(
      req.user.userId || req.user.sub,
      id,
      dto,
    );
  }

  /**
   * Añadir mensaje de admin a una disputa
   */
  @Post(':id/messages')
  addAdminMessage(
    @Param('id') id: string,
    @Body() dto: AddDisputeMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.disputesService.addMessage(
      req.user.userId || req.user.sub,
      id,
      dto,
    );
  }
}
