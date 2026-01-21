import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  /**
   * GET /api/referrals/validate?code=XXX
   * Valida un codigo de referido (publico, para registro)
   */
  @Get('validate')
  validateCode(@Query('code') code: string) {
    return this.referralsService.validateReferralCode(code);
  }

  /**
   * GET /api/referrals/my
   * Obtiene estadisticas de referidos del usuario actual
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyReferralStats(@Request() req) {
    return this.referralsService.getReferralStats(req.user.id);
  }

  /**
   * POST /api/referrals/generate-code
   * Genera o recupera el codigo de referido del usuario
   */
  @Post('generate-code')
  @UseGuards(JwtAuthGuard)
  async generateCode(@Request() req) {
    const code = await this.referralsService.generateReferralCode(req.user.id);
    const referralLink = `${process.env.FRONTEND_URL || 'https://fiestapp.es'}/register?ref=${code}`;
    return { code, referralLink };
  }
}
