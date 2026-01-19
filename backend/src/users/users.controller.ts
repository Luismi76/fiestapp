import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedUser {
  userId: string;
  email: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Obtener mi perfil completo (requiere auth)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@Request() req: AuthenticatedRequest) {
    return this.usersService.getMyProfile(req.user.userId);
  }

  // Obtener estadísticas de anfitrión
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  getHostStats(@Request() req: AuthenticatedRequest) {
    return this.usersService.getHostStats(req.user.userId);
  }

  // Actualizar mi perfil (requiere auth)
  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Body() updateDto: UpdateProfileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateProfile(req.user.userId, updateDto);
  }

  // Obtener perfil público de un usuario (público)
  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}
