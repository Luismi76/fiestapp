import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verificar si Google OAuth está configurado
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      const response = context.switchToHttp().getResponse<Response>();
      response.status(503).json({
        statusCode: 503,
        message: 'Google OAuth no está configurado en este servidor.',
      });
      return false;
    }

    return super.canActivate(context);
  }

  // Method signature required by Passport - extra params are part of the interface

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw err || new Error('No se pudo autenticar con Google');
    }
    return user;
  }
}
