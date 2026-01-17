import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { FestivalsService } from './festivals.service';
import { CreateFestivalDto } from './dto/create-festival.dto';

@Controller('festivals')
export class FestivalsController {
  constructor(private readonly festivalsService: FestivalsService) {}

  @Get()
  findAll() {
    return this.festivalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.festivalsService.findOne(id);
  }

  @Post()
  create(@Body() createFestivalDto: CreateFestivalDto) {
    return this.festivalsService.create(createFestivalDto);
  }

  // Endpoint para poblar la base de datos con festivales iniciales
  @Post('seed')
  seed() {
    return this.festivalsService.seed();
  }
}
