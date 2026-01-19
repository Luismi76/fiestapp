import { Controller, Post, UseGuards } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  // Manual trigger for testing (admin only in production)
  @Post('trigger')
  @UseGuards(JwtAuthGuard)
  triggerReminders() {
    return this.remindersService.triggerReminders();
  }
}
