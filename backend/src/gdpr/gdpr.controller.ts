import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GdprService } from './gdpr.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

class RequestDeletionDto {
  reason?: string;
}

@ApiTags('GDPR')
@ApiBearerAuth()
@Controller('gdpr')
@UseGuards(JwtAuthGuard)
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('export')
  @ApiOperation({
    summary: 'Exportar datos personales',
    description:
      'Exporta todos los datos personales del usuario en formato JSON (GDPR Art. 20 - Derecho a la portabilidad)',
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo JSON con todos los datos del usuario',
  })
  async exportData(
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.gdprService.exportUserData(req.user.userId);

    const filename = `fiestapp-datos-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(JSON.stringify(data, null, 2));
  }

  @Get('export/preview')
  @ApiOperation({
    summary: 'Vista previa de datos exportables',
    description: 'Muestra una vista previa de los datos que se exportarán',
  })
  async exportDataPreview(@Request() req: AuthenticatedRequest) {
    return this.gdprService.exportUserData(req.user.userId);
  }

  @Post('delete-request')
  @ApiOperation({
    summary: 'Solicitar eliminación de cuenta',
    description:
      'Solicita la eliminación de la cuenta (GDPR Art. 17 - Derecho al olvido). La cuenta será eliminada después de 30 días.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud de eliminación registrada',
  })
  async requestDeletion(
    @Request() req: AuthenticatedRequest,
    @Body() body: RequestDeletionDto,
  ) {
    return this.gdprService.requestAccountDeletion(
      req.user.userId,
      body.reason,
    );
  }

  @Delete('delete-request')
  @ApiOperation({
    summary: 'Cancelar solicitud de eliminación',
    description: 'Cancela una solicitud de eliminación de cuenta pendiente',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud de eliminación cancelada',
  })
  async cancelDeletion(@Request() req: AuthenticatedRequest) {
    return this.gdprService.cancelDeletionRequest(req.user.userId);
  }

  @Get('deletion-status')
  @ApiOperation({
    summary: 'Estado de solicitud de eliminación',
    description:
      'Consulta si hay una solicitud de eliminación pendiente y cuándo se ejecutará',
  })
  async getDeletionStatus(@Request() req: AuthenticatedRequest) {
    return this.gdprService.getDeletionStatus(req.user.userId);
  }
}
