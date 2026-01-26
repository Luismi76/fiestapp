import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // Autocomplete (publico, no requiere auth)
  @Get('autocomplete')
  autocomplete(@Query('q') query: string, @Query('limit') limit?: string) {
    return this.searchService.autocomplete(
      query,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // Busquedas populares (publico)
  @Get('popular')
  getPopularSearches(@Query('limit') limit?: string) {
    return this.searchService.getPopularSearches(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // Historial del usuario (requiere auth)
  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.getHistory(
      req.user.userId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // Guardar busqueda (requiere auth)
  @Post('history')
  @UseGuards(JwtAuthGuard)
  saveSearch(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      query: string;
      filters?: {
        city?: string;
        festival?: string;
        type?: string;
        minPrice?: number;
        maxPrice?: number;
        minRating?: number;
        languages?: string[];
        accessibility?: string[];
      };
    },
  ) {
    return this.searchService.saveSearch(req.user.userId, body);
  }

  // Limpiar historial (requiere auth)
  @Delete('history')
  @UseGuards(JwtAuthGuard)
  clearHistory(@Request() req: AuthenticatedRequest) {
    return this.searchService.clearHistory(req.user.userId);
  }

  // Eliminar una busqueda especifica (requiere auth)
  @Delete('history/:id')
  @UseGuards(JwtAuthGuard)
  deleteSearch(
    @Request() req: AuthenticatedRequest,
    @Param('id') searchId: string,
  ) {
    return this.searchService.deleteSearch(req.user.userId, searchId);
  }
}
