import { SkipThrottle } from '@nestjs/throttler';
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
  Headers,
  Req,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { SendMessageDto } from './dto/update-match.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('matches')
export class MatchesController {
  private readonly logger = new Logger(MatchesController.name);

  constructor(
    private readonly matchesService: MatchesService,
    private readonly configService: ConfigService,
  ) {}

  // Webhook de Stripe para pago de experiencia (SIN auth ni rate limiting, usa firma de Stripe)
  @SkipThrottle()
  @Post('stripe-webhook')
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured');
      return { received: true };
    }

    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured');
      return { received: true };
    }

    try {
      const stripe = new (await import('stripe')).default(stripeKey);
      const event = stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        webhookSecret,
      );

      await this.matchesService.handleExperiencePaymentWebhook(event);
    } catch (error) {
      this.logger.error('Error processing Stripe webhook:', error);
    }
    return { received: true };
  }

  // Crear solicitud de match
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createDto: CreateMatchDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.matchesService.create(createDto, req.user.userId);
  }

  // Solicitudes recibidas (soy host)
  @Get('received')
  @UseGuards(JwtAuthGuard)
  findReceived(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.matchesService.findReceivedMatches(
      req.user.userId,
      status,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      search,
    );
  }

  // Mis solicitudes (soy requester)
  @Get('sent')
  @UseGuards(JwtAuthGuard)
  findSent(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.matchesService.findSentMatches(
      req.user.userId,
      status,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      search,
    );
  }

  // Estadísticas de matches
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats(@Request() req: AuthenticatedRequest) {
    return this.matchesService.getStats(req.user.userId);
  }

  // Contar mensajes no leídos
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  countUnread(@Request() req: AuthenticatedRequest) {
    return this.matchesService.countUnreadMessages(req.user.userId);
  }

  // Detalle de un match
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.matchesService.findOne(id, req.user.userId);
  }

  // Crear pago de experiencia (viajero)
  @Post(':id/create-payment')
  @UseGuards(JwtAuthGuard)
  createPayment(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { paymentMode?: 'immediate' | 'escrow' },
  ) {
    return this.matchesService.createExperiencePayment(
      id,
      req.user.userId,
      body?.paymentMode || 'escrow',
    );
  }

  // Verificar estado del pago
  @Get(':id/payment-status')
  @UseGuards(JwtAuthGuard)
  getPaymentStatus(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.matchesService.getPaymentStatus(id, req.user.userId);
  }

  // Aceptar solicitud
  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  reject(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.matchesService.reject(id, req.user.userId);
  }

  // Cancelar solicitud
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('reason') reason?: string,
  ) {
    return this.matchesService.cancel(id, req.user.userId, reason);
  }

  // Marcar como completado (legacy - solo host)
  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  complete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.matchesService.complete(id, req.user.userId);
  }

  // Confirmar experiencia completada (sistema bidireccional)
  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard)
  confirmCompletion(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.matchesService.confirmCompletion(id, req.user.userId);
  }

  // Enviar mensaje
  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
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
