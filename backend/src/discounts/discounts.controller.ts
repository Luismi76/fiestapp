import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  // ============================================
  // Endpoints publicos (para usuarios)
  // ============================================

  /**
   * POST /api/discounts/validate
   * Valida un codigo de descuento sin aplicarlo
   */
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  validateDiscount(
    @Request() req: AuthenticatedRequest,
    @Body('code') code: string,
    @Body('amount') amount: number,
  ) {
    return this.discountsService.validateDiscount(
      code,
      req.user.userId,
      amount,
    );
  }

  /**
   * POST /api/discounts/apply
   * Aplica un codigo de descuento
   */
  @Post('apply')
  @UseGuards(JwtAuthGuard)
  applyDiscount(
    @Request() req: AuthenticatedRequest,
    @Body('code') code: string,
    @Body('amount') amount: number,
    @Body('transactionId') transactionId?: string,
  ) {
    return this.discountsService.applyDiscount(
      code,
      req.user.userId,
      amount,
      transactionId,
    );
  }

  // ============================================
  // Endpoints de admin
  // ============================================

  /**
   * GET /api/discounts/admin
   * Lista todos los codigos de descuento (admin)
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAllDiscounts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeExpired') includeExpired?: string,
  ) {
    return this.discountsService.getAllDiscounts(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      includeExpired === 'true',
    );
  }

  /**
   * GET /api/discounts/admin/:id
   * Obtiene detalle de un codigo (admin)
   */
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getDiscountById(@Param('id') id: string) {
    return this.discountsService.getDiscountById(id);
  }

  /**
   * POST /api/discounts/admin
   * Crea un nuevo codigo de descuento (admin)
   */
  @Post('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  createDiscount(@Body() data: CreateDiscountDto) {
    return this.discountsService.createDiscount(data);
  }

  /**
   * PUT /api/discounts/admin/:id
   * Actualiza un codigo de descuento (admin)
   */
  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateDiscount(
    @Param('id') id: string,
    @Body() data: Partial<CreateDiscountDto>,
  ) {
    return this.discountsService.updateDiscount(id, data);
  }

  /**
   * POST /api/discounts/admin/:id/toggle
   * Activa/desactiva un codigo (admin)
   */
  @Post('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  toggleDiscountActive(@Param('id') id: string) {
    return this.discountsService.toggleDiscountActive(id);
  }

  /**
   * DELETE /api/discounts/admin/:id
   * Elimina un codigo de descuento (admin)
   */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDiscount(@Param('id') id: string) {
    return this.discountsService.deleteDiscount(id);
  }
}
