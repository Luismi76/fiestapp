import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedUser {
  userId: string;
  email: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Crear reseña (requiere auth)
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createDto: CreateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.create(createDto, req.user.userId);
  }

  // Obtener reseñas de una experiencia (público)
  @Get('experience/:experienceId')
  findByExperience(
    @Param('experienceId') experienceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findByExperience(
      experienceId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // Obtener reseñas recibidas por un usuario (público)
  @Get('user/:userId/received')
  findReceivedByUser(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findReceivedByUser(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // Obtener reseñas escritas por el usuario autenticado
  @Get('my/written')
  @UseGuards(JwtAuthGuard)
  findMyWritten(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findWrittenByUser(
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // Obtener reseñas recibidas por el usuario autenticado
  @Get('my/received')
  @UseGuards(JwtAuthGuard)
  findMyReceived(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findReceivedByUser(
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // Verificar si puedo dejar reseña
  @Get('can-review/:experienceId')
  @UseGuards(JwtAuthGuard)
  canReview(
    @Param('experienceId') experienceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.canReview(experienceId, req.user.userId);
  }

  // Obtener una reseña por ID (público)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  // Actualizar reseña (solo autor)
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.update(id, updateDto, req.user.userId);
  }

  // Eliminar reseña (solo autor)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.reviewsService.remove(id, req.user.userId);
  }
}
