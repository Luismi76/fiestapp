import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QuickRepliesService } from './quick-replies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('quick-replies')
@UseGuards(JwtAuthGuard)
export class QuickRepliesController {
  constructor(private readonly quickRepliesService: QuickRepliesService) {}

  // Obtener todas las respuestas rápidas (del usuario + predeterminadas)
  @Get()
  getAll(@Request() req: AuthenticatedRequest) {
    return this.quickRepliesService.getAllReplies(req.user.userId);
  }

  // Obtener solo las respuestas del usuario
  @Get('user')
  getUserReplies(@Request() req: AuthenticatedRequest) {
    return this.quickRepliesService.getQuickReplies(req.user.userId);
  }

  // Obtener solo las respuestas predeterminadas
  @Get('defaults')
  getDefaults() {
    return this.quickRepliesService.getDefaultReplies();
  }

  // Crear nueva respuesta rápida
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() body: { text: string; emoji?: string },
  ) {
    return this.quickRepliesService.createQuickReply(
      req.user.userId,
      body.text,
      body.emoji,
    );
  }

  // Actualizar respuesta rápida
  @Put(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { text?: string; emoji?: string | null },
  ) {
    return this.quickRepliesService.updateQuickReply(req.user.userId, id, body);
  }

  // Eliminar respuesta rápida
  @Delete(':id')
  delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.quickRepliesService.deleteQuickReply(req.user.userId, id);
  }

  // Reordenar respuestas rápidas
  @Post('reorder')
  reorder(
    @Request() req: AuthenticatedRequest,
    @Body() body: { replyIds: string[] },
  ) {
    return this.quickRepliesService.reorderQuickReplies(
      req.user.userId,
      body.replyIds,
    );
  }
}
