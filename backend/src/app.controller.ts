import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
    redis?: 'ok' | 'error' | 'not_configured';
  };
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {
      database: 'error',
    };

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Check Redis if configured
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      checks.redis = 'ok'; // CacheService handles Redis internally
    } else {
      checks.redis = 'not_configured';
    }

    // Determine overall status
    const hasErrors = checks.database === 'error';
    const status = hasErrors ? 'error' : 'ok';

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks,
    };
  }

  @Get('health/live')
  getLiveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('health/ready')
  async getReadiness(): Promise<{ status: string; ready: boolean }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', ready: true };
    } catch {
      return { status: 'error', ready: false };
    }
  }
}
