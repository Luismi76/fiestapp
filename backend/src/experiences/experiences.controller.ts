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
  BadRequestException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ExperiencesService } from './experiences.service';
import { PricingService, GroupPricingTier } from './pricing.service';
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
  constructor(
    private readonly experiencesService: ExperiencesService,
    private readonly pricingService: PricingService,
  ) {}

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
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('hostHasPartner') hostHasPartner?: string,
    @Query('hostHasChildren') hostHasChildren?: string,
  ) {
    return this.experiencesService.findAll({
      festivalId,
      city,
      type,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search,
      sortBy: sortBy as 'newest' | 'price_asc' | 'price_desc' | 'rating',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      hostHasPartner:
        hostHasPartner === 'true'
          ? true
          : hostHasPartner === 'false'
            ? false
            : undefined,
      hostHasChildren:
        hostHasChildren === 'true'
          ? true
          : hostHasChildren === 'false'
            ? false
            : undefined,
    });
  }

  // Obtener ciudades unicas (publico)
  @Get('cities')
  getCities() {
    return this.experiencesService.getCities();
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

  // Obtener ocupación por fechas (público)
  @Get(':id/occupancy')
  getOccupancy(@Param('id') id: string) {
    return this.experiencesService.getOccupancy(id);
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

  // Calcular precio para grupo (público)
  @Get(':id/calculate-price')
  async calculatePrice(
    @Param('id') id: string,
    @Query('participants') participants: string,
  ) {
    const numParticipants = parseInt(participants, 10);
    if (isNaN(numParticipants) || numParticipants < 1) {
      throw new BadRequestException('El número de participantes debe ser al menos 1');
    }
    return this.pricingService.calculateGroupPrice(id, numParticipants);
  }

  // Obtener precios grupales de una experiencia (público)
  @Get(':id/group-pricing')
  getGroupPricing(@Param('id') id: string) {
    return this.pricingService.getGroupPricing(id);
  }

  // Establecer precios grupales (requiere auth + ser el dueño)
  @Post(':id/group-pricing')
  @UseGuards(JwtAuthGuard)
  setGroupPricing(
    @Param('id') id: string,
    @Body() body: { tiers: GroupPricingTier[] },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.pricingService.setGroupPricing(id, req.user.userId, body.tiers);
  }

  // Actualizar precios grupales (requiere auth + ser el dueño)
  @Put(':id/group-pricing')
  @UseGuards(JwtAuthGuard)
  updateGroupPricing(
    @Param('id') id: string,
    @Body() body: { tiers: GroupPricingTier[] },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.pricingService.setGroupPricing(id, req.user.userId, body.tiers);
  }

  // Actualizar límites de participantes (requiere auth + ser el dueño)
  @Patch(':id/participant-limits')
  @UseGuards(JwtAuthGuard)
  updateParticipantLimits(
    @Param('id') id: string,
    @Body() body: { minParticipants: number; maxParticipants?: number | null },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.pricingService.updateExperienceParticipantLimits(
      id,
      req.user.userId,
      body.minParticipants,
      body.maxParticipants ?? null,
    );
  }
}
