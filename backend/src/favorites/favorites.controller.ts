import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedUser {
  userId: string;
  email: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // =============================================
  // EXPERIENCIAS FAVORITAS
  // =============================================

  // Obtener todos los favoritos del usuario (experiencias)
  @Get()
  getFavorites(@Request() req: AuthenticatedRequest) {
    return this.favoritesService.getFavorites(req.user.userId);
  }

  // Obtener solo los IDs de experiencias favoritas
  @Get('ids')
  getFavoriteIds(@Request() req: AuthenticatedRequest) {
    return this.favoritesService.getFavoriteIds(req.user.userId);
  }

  // Verificar si una experiencia es favorita
  @Get(':experienceId/check')
  isFavorite(
    @Param('experienceId') experienceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.isFavorite(req.user.userId, experienceId);
  }

  // Anadir experiencia a favoritos
  @Post(':experienceId')
  addFavorite(
    @Param('experienceId') experienceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.addFavorite(req.user.userId, experienceId);
  }

  // Eliminar experiencia de favoritos
  @Delete(':experienceId')
  removeFavorite(
    @Param('experienceId') experienceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.removeFavorite(req.user.userId, experienceId);
  }

  // =============================================
  // FESTIVALES FAVORITOS
  // =============================================

  // Listar festivales favoritos
  @Get('festivals')
  getFestivalFavorites(@Request() req: AuthenticatedRequest) {
    return this.favoritesService.getFestivalFavorites(req.user.userId);
  }

  // Obtener IDs de festivales favoritos
  @Get('festivals/ids')
  getFestivalFavoriteIds(@Request() req: AuthenticatedRequest) {
    return this.favoritesService.getFestivalFavoriteIds(req.user.userId);
  }

  // Verificar si un festival es favorito
  @Get('festivals/:festivalId/check')
  isFestivalFavorite(
    @Param('festivalId') festivalId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.isFestivalFavorite(
      req.user.userId,
      festivalId,
    );
  }

  // Anadir festival a favoritos
  @Post('festivals/:festivalId')
  addFestivalFavorite(
    @Param('festivalId') festivalId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.addFestivalFavorite(
      req.user.userId,
      festivalId,
    );
  }

  // Eliminar festival de favoritos
  @Delete('festivals/:festivalId')
  removeFestivalFavorite(
    @Param('festivalId') festivalId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.removeFestivalFavorite(
      req.user.userId,
      festivalId,
    );
  }

  // =============================================
  // ALERTAS DE DISPONIBILIDAD
  // =============================================

  // Obtener estado de todas las alertas
  @Get('alerts')
  getAlertsStatus(@Request() req: AuthenticatedRequest) {
    return this.favoritesService.getAlertsStatus(req.user.userId);
  }

  // Activar alerta de disponibilidad para una experiencia
  @Post(':experienceId/alert')
  enableAlert(
    @Param('experienceId') experienceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.enableAlert(req.user.userId, experienceId);
  }

  // Desactivar alerta de disponibilidad
  @Delete(':experienceId/alert')
  disableAlert(
    @Param('experienceId') experienceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.disableAlert(req.user.userId, experienceId);
  }

  // =============================================
  // COMBINADO
  // =============================================

  // Obtener todo (experiencias + festivales)
  @Get('all')
  getAllFavorites(@Request() req: AuthenticatedRequest) {
    return this.favoritesService.getAllFavorites(req.user.userId);
  }
}
