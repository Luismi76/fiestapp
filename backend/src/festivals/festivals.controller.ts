import { Controller, Get, Post, Param, Body, Query, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { FestivalsService } from './festivals.service';
import { ICalService } from './ical.service';
import { CreateFestivalDto } from './dto/create-festival.dto';

@Controller('festivals')
export class FestivalsController {
  constructor(
    private readonly festivalsService: FestivalsService,
    private readonly icalService: ICalService,
  ) {}

  @Get()
  findAll() {
    return this.festivalsService.findAll();
  }

  // =============================================
  // CALENDARIO
  // =============================================

  // Obtener datos del calendario para el año actual
  @Get('calendar')
  getCalendar(
    @Query('region') region?: string,
    @Query('type') type?: string,
    @Query('city') city?: string,
  ) {
    const year = new Date().getFullYear();
    return this.festivalsService.getCalendarData(year, { region, type, city });
  }

  // Obtener datos del calendario para un año específico
  @Get('calendar/:year')
  getCalendarByYear(
    @Param('year') year: string,
    @Query('region') region?: string,
    @Query('type') type?: string,
    @Query('city') city?: string,
  ) {
    return this.festivalsService.getCalendarData(parseInt(year, 10), {
      region,
      type,
      city,
    });
  }

  // Obtener lista de regiones
  @Get('regions')
  getRegions() {
    return this.festivalsService.getRegions();
  }

  // Obtener lista de tipos
  @Get('types')
  getTypes() {
    return this.festivalsService.getTypes();
  }

  // Obtener lista de ciudades
  @Get('cities')
  getCities() {
    return this.festivalsService.getCities();
  }

  // =============================================
  // iCAL EXPORT
  // =============================================

  // Exportar todos los festivales a iCal (con filtros opcionales)
  @Get('ical')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="festivales-espana.ics"')
  async getIcalFeed(
    @Res() res: Response,
    @Query('region') region?: string,
    @Query('type') type?: string,
    @Query('city') city?: string,
  ) {
    const festivals = await this.festivalsService.getFestivalsForIcal({
      region,
      type,
      city,
    });
    const icalContent = this.icalService.generateICalFeed(festivals);
    res.send(icalContent);
  }

  // Exportar un festival individual a iCal
  @Get(':id/ical')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async getIcalEvent(@Param('id') id: string, @Res() res: Response) {
    const festival = await this.festivalsService.findOne(id);
    const icalContent = this.icalService.generateICalFeed([festival]);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${festival.name.replace(/[^a-zA-Z0-9]/g, '-')}.ics"`,
    );
    res.send(icalContent);
  }

  // Obtener URL de Google Calendar para un festival
  @Get(':id/google-calendar')
  async getGoogleCalendarUrl(@Param('id') id: string) {
    const festival = await this.festivalsService.findOne(id);
    return {
      url: this.icalService.generateGoogleCalendarUrl(festival),
    };
  }

  // =============================================
  // CRUD BASICO
  // =============================================

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
