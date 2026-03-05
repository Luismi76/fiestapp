import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';

@ApiTags('evaluations')
@Controller('evaluations')
export class EvaluationController {
  private readonly logger = new Logger(EvaluationController.name);

  constructor(
    private readonly evaluationService: EvaluationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Valida el código de acceso de evaluación
   */
  private validateEvalCode(code: string | undefined): void {
    const validCode = this.configService.get<string>('EVAL_ACCESS_CODE');
    if (!validCode) {
      throw new ForbiddenException('Sistema de evaluación no configurado');
    }
    if (!code || code !== validCode) {
      throw new ForbiddenException('Código de acceso inválido');
    }
  }

  // ============================================
  // Endpoints públicos (protegidos por código)
  // ============================================

  @Post('verify-code')
  @HttpCode(200)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verificar código de acceso de evaluación' })
  @ApiResponse({ status: 200, description: 'Código válido' })
  @ApiResponse({ status: 403, description: 'Código inválido' })
  verifyCode(@Body('code') code: string): { valid: boolean } {
    const validCode = this.configService.get<string>('EVAL_ACCESS_CODE');
    return { valid: !!validCode && code === validCode };
  }

  @Post()
  @HttpCode(201)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Enviar evaluación del prototipo' })
  @ApiResponse({ status: 201, description: 'Evaluación creada' })
  @ApiResponse({ status: 403, description: 'Código de acceso inválido' })
  async create(
    @Body() dto: CreateEvaluationDto,
    @Headers('x-eval-code') evalCode: string,
  ) {
    this.validateEvalCode(evalCode);
    const evaluation = await this.evaluationService.create(dto);
    this.logger.log(
      `Nueva evaluación de ${dto.evaluatorName}: ${dto.category} (${dto.priority}) en ${dto.page}`,
    );
    return evaluation;
  }

  // ============================================
  // Endpoints de administración (JWT + Admin)
  // ============================================

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Listar evaluaciones (admin)' })
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('evaluatorName') evaluatorName?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.evaluationService.findAll({
      status,
      category,
      evaluatorName,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Estadísticas de evaluaciones (admin)' })
  async getStats() {
    return this.evaluationService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Ver evaluación detallada (admin)' })
  async findOne(@Param('id') id: string) {
    const evaluation = await this.evaluationService.findOne(id);
    if (!evaluation) throw new NotFoundException('Evaluación no encontrada');
    return evaluation;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Actualizar estado/notas de evaluación (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateEvaluationDto) {
    const evaluation = await this.evaluationService.findOne(id);
    if (!evaluation) throw new NotFoundException('Evaluación no encontrada');
    return this.evaluationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Eliminar evaluación (admin)' })
  async remove(@Param('id') id: string) {
    const evaluation = await this.evaluationService.findOne(id);
    if (!evaluation) throw new NotFoundException('Evaluación no encontrada');
    return this.evaluationService.remove(id);
  }
}
