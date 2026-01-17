import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ExperiencesService } from './experiences.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedUser {
  userId: string;
  email: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@Controller('experiences')
export class ExperiencesController {
  constructor(private readonly experiencesService: ExperiencesService) {}

  // Crear experiencia (requiere auth)
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createDto: CreateExperienceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.experiencesService.create(createDto, req.user.userId);
  }

  // Listar experiencias (público)
  @Get()
  findAll(
    @Query('festivalId') festivalId?: string,
    @Query('city') city?: string,
    @Query('type') type?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.experiencesService.findAll({
      festivalId,
      city,
      type,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  // Mis experiencias (requiere auth)
  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMyExperiences(@Request() req: AuthenticatedRequest) {
    return this.experiencesService.findByHost(req.user.userId);
  }

  // Detalle de experiencia (público)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.experiencesService.findOne(id);
  }

  // Actualizar experiencia (requiere auth + ser el dueño)
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateExperienceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.experiencesService.update(id, updateDto, req.user.userId);
  }

  // Toggle publicado (requiere auth + ser el dueño)
  @Patch(':id/toggle-published')
  @UseGuards(JwtAuthGuard)
  togglePublished(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.experiencesService.togglePublished(id, req.user.userId);
  }

  // Eliminar experiencia (requiere auth + ser el dueño)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.experiencesService.remove(id, req.user.userId);
  }
}
