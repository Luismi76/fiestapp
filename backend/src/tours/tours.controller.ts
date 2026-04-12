import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ToursService } from './tours.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('tours')
@UseGuards(JwtAuthGuard)
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get('completed')
  async getCompleted(@Request() req: AuthenticatedRequest) {
    const completed = await this.toursService.getCompleted(req.user.userId);
    return { completed };
  }

  @Post(':tourId/complete')
  async markCompleted(
    @Param('tourId') tourId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const completed = await this.toursService.markCompleted(
      req.user.userId,
      tourId,
    );
    return { completed };
  }

  @Delete(':tourId')
  async reset(
    @Param('tourId') tourId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const completed = await this.toursService.reset(req.user.userId, tourId);
    return { completed };
  }

  @Delete()
  async resetAll(@Request() req: AuthenticatedRequest) {
    const completed = await this.toursService.resetAll(req.user.userId);
    return { completed };
  }
}
