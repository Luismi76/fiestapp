import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { FiscalClosureService } from './fiscal-closure.service';

@Controller('admin/fiscal-periods')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminFiscalClosureController {
  constructor(private readonly fiscalClosure: FiscalClosureService) {}

  @Get()
  async list() {
    const periods = await this.fiscalClosure.list(12);
    return { periods };
  }

  @Post('close')
  @HttpCode(HttpStatus.CREATED)
  async close(
    @Request() req: AuthenticatedRequest,
    @Body() body: { year?: number; quarter?: number; notes?: string },
  ) {
    if (typeof body.year !== 'number' || typeof body.quarter !== 'number') {
      throw new BadRequestException('year y quarter son obligatorios');
    }
    if (body.quarter < 1 || body.quarter > 4) {
      throw new BadRequestException('quarter debe estar entre 1 y 4');
    }
    return this.fiscalClosure.close({
      year: body.year,
      quarter: body.quarter,
      closedByUserId: req.user.userId,
      notes: body.notes,
    });
  }

  @Post(':period/reopen')
  @HttpCode(HttpStatus.OK)
  async reopen(
    @Request() req: AuthenticatedRequest,
    @Param('period') period: string,
    @Body() body: { reason?: string },
  ) {
    if (!body.reason || body.reason.trim().length < 5) {
      throw new BadRequestException(
        'Motivo obligatorio (mínimo 5 caracteres) al reabrir un periodo',
      );
    }
    return this.fiscalClosure.reopen({
      period,
      reopenedByUserId: req.user.userId,
      reason: body.reason.trim(),
    });
  }

  @Post(':period/modelo-303-submitted')
  @HttpCode(HttpStatus.OK)
  async markModelo303(@Param('period') period: string) {
    return this.fiscalClosure.markModelo303Submitted(period);
  }
}
