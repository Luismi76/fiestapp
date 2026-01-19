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

  // Obtener todos los favoritos del usuario
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

  // Anadir a favoritos
  @Post(':experienceId')
  addFavorite(
    @Param('experienceId') experienceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.addFavorite(req.user.userId, experienceId);
  }

  // Eliminar de favoritos
  @Delete(':experienceId')
  removeFavorite(
    @Param('experienceId') experienceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.favoritesService.removeFavorite(req.user.userId, experienceId);
  }
}
