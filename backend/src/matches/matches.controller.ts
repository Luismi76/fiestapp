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
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { SendMessageDto } from './dto/update-match.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  // Crear solicitud de match
  @Post()
  create(
    @Body() createDto: CreateMatchDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.matchesService.create(createDto, req.user.userId);
  }

  // Solicitudes recibidas (soy host)
  @Get('received')
  findReceived(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    return this.matchesService.findReceivedMatches(req.user.userId, status);
  }

  // Mis solicitudes (soy requester)
  @Get('sent')
  findSent(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    return this.matchesService.findSentMatches(req.user.userId, status);
  }

  // Estadísticas de matches
  @Get('stats')
  getStats(@Request() req: AuthenticatedRequest) {
    return this.matchesService.getStats(req.user.userId);
  }

  // Contar mensajes no leídos
  @Get('unread-count')
  countUnread(@Request() req: AuthenticatedRequest) {
    return this.matchesService.countUnreadMessages(req.user.userId);
  }

  // Detalle de un match
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.matchesService.findOne(id, req.user.userId);
  }

  // Aceptar solicitud
  @Patch(':id/accept')
  accept(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('startDate') startDate?: string,
    @Body('endDate') endDate?: string,
  ) {
    return this.matchesService.accept(id, req.user.userId, startDate, endDate);
  }

  // Rechazar solicitud
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.matchesService.reject(id, req.user.userId);
  }

  // Cancelar solicitud
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('reason') reason?: string,
  ) {
    return this.matchesService.cancel(id, req.user.userId, reason);
  }

  // Marcar como completado (legacy - solo host)
  @Patch(':id/complete')
  complete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.matchesService.complete(id, req.user.userId);
  }

  // Confirmar experiencia completada (sistema bidireccional)
  @Patch(':id/confirm')
  confirmCompletion(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.matchesService.confirmCompletion(id, req.user.userId);
  }

  // Enviar mensaje
  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() messageDto: SendMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.matchesService.sendMessage(
      id,
      req.user.userId,
      messageDto.content,
    );
  }
}
