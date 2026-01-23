import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadgesService } from './badges.service';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /**
   * GET /api/badges
   * Obtiene todos los badges disponibles
   */
  @Get()
  async getAllBadges() {
    return this.badgesService.getAllBadges();
  }

  /**
   * GET /api/badges/my
   * Obtiene los badges del usuario autenticado
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyBadges(@Request() req) {
    return this.badgesService.getUserBadges(req.user.id);
  }

  /**
   * GET /api/badges/user/:userId
   * Obtiene los badges de un usuario especifico
   */
  @Get('user/:userId')
  async getUserBadges(@Param('userId') userId: string) {
    return this.badgesService.getUserBadges(userId);
  }

  /**
   * GET /api/badges/reputation/:userId
   * Obtiene la reputacion completa de un usuario
   */
  @Get('reputation/:userId')
  async getUserReputation(@Param('userId') userId: string) {
    return this.badgesService.getUserReputation(userId);
  }

  /**
   * GET /api/badges/reputation/my
   * Obtiene la reputacion del usuario autenticado
   */
  @Get('reputation/my')
  @UseGuards(JwtAuthGuard)
  async getMyReputation(@Request() req) {
    return this.badgesService.getUserReputation(req.user.id);
  }

  /**
   * POST /api/badges/check
   * Verifica y asigna badges pendientes al usuario autenticado
   */
  @Post('check')
  @UseGuards(JwtAuthGuard)
  async checkBadges(@Request() req) {
    const awarded = await this.badgesService.checkAndAwardBadges(req.user.id);
    return {
      message:
        awarded.length > 0 ? 'Badges otorgados!' : 'No hay nuevos badges',
      awarded,
    };
  }
}
