import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Verifica el estado de salud de la aplicación y sus dependencias',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio saludable',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio no saludable',
  })
  check() {
    return this.health.check([
      // Base de datos
      () => this.prisma.isHealthy('database'),
      // Memoria heap (max 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // Memoria RSS (max 500MB)
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Verifica si la aplicación está viva (para Kubernetes)',
  })
  @ApiResponse({ status: 200, description: 'Aplicación viva' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Verifica si la aplicación está lista para recibir tráfico',
  })
  @ApiResponse({ status: 200, description: 'Aplicación lista' })
  @ApiResponse({ status: 503, description: 'Aplicación no lista' })
  ready() {
    return this.health.check([
      // Solo verificar la base de datos para readiness
      () => this.prisma.isHealthy('database'),
    ]);
  }
}
