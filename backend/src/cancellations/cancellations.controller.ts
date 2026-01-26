import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CancellationsService } from './cancellations.service';
import { CancellationPolicy } from '@prisma/client';

@Controller('cancellations')
@UseGuards(JwtAuthGuard)
export class CancellationsController {
  constructor(private cancellationsService: CancellationsService) {}

  /**
   * Obtener preview de cancelación para un match
   */
  @Get('preview/:matchId')
  async previewCancellation(@Param('matchId') matchId: string) {
    const preview =
      await this.cancellationsService.previewCancellation(matchId);
    return { data: preview };
  }

  /**
   * Obtener descripción de una política de cancelación
   */
  @Get('policy/:policy')
  getPolicyDescription(@Param('policy') policy: string) {
    const validPolicy = Object.values(CancellationPolicy).includes(
      policy as CancellationPolicy,
    )
      ? (policy as CancellationPolicy)
      : CancellationPolicy.FLEXIBLE;

    const description =
      this.cancellationsService.getPolicyDescription(validPolicy);
    return { data: description };
  }

  /**
   * Obtener todas las políticas de cancelación disponibles
   */
  @Get('policies')
  getAllPolicies() {
    const policies = Object.values(CancellationPolicy).map((policy) => ({
      value: policy,
      ...this.cancellationsService.getPolicyDescription(policy),
    }));
    return { data: policies };
  }

  /**
   * Obtener historial de cancelaciones del usuario
   */
  @Get('history')
  async getCancellationHistory(@Request() req: { user: { sub: string } }) {
    const cancellations = await this.cancellationsService.getUserCancellations(
      req.user.sub,
    );
    return { data: cancellations };
  }

  /**
   * Obtener estadísticas de cancelaciones del usuario
   */
  @Get('stats')
  async getCancellationStats(@Request() req: { user: { sub: string } }) {
    const stats = await this.cancellationsService.getCancellationStats(
      req.user.sub,
    );
    return { data: stats };
  }
}
