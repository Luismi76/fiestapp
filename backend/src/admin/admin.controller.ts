import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('experiences')
  getExperiences(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'all' | 'published' | 'draft',
  ) {
    return this.adminService.getExperiences(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Post('experiences/:id/toggle-published')
  toggleExperiencePublished(@Param('id') id: string) {
    return this.adminService.toggleExperiencePublished(id);
  }

  @Post('users/:id/role')
  setUserRole(
    @Param('id') id: string,
    @Body('role') role: 'user' | 'admin',
  ) {
    return this.adminService.setUserRole(id, role);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Delete('experiences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteExperience(@Param('id') id: string) {
    return this.adminService.deleteExperience(id);
  }

  @Post('users/:id/impersonate')
  impersonateUser(@Param('id') id: string) {
    return this.adminService.impersonateUser(id);
  }
}
