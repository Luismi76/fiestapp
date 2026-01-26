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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard)
export class AdminDisputesController {
  constructor(private disputesService: DisputesService) {}

  /**
   * Obtener todas las disputas (admin)
   */
  @Get()
  getAllDisputes(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.disputesService.getAllDisputes(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Obtener estadísticas de disputas (admin)
   */
  @Get('stats')
  getStats() {
    return this.disputesService.getDisputeStats();
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
