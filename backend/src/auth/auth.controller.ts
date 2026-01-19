import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SendPhoneVerificationDto,
  VerifyPhoneDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './strategies/jwt.strategy';

interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendDto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.validateUser(req.user.userId);
  }

  @Post('send-phone-verification')
  @UseGuards(JwtAuthGuard)
  async sendPhoneVerification(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SendPhoneVerificationDto,
  ) {
    return this.authService.sendPhoneVerification(req.user.userId, dto);
  }

  @Post('verify-phone')
  @UseGuards(JwtAuthGuard)
  async verifyPhone(
    @Request() req: AuthenticatedRequest,
    @Body() dto: VerifyPhoneDto,
  ) {
    return this.authService.verifyPhone(req.user.userId, dto);
  }
}
