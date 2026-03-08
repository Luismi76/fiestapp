import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    // Si Google devuelve un error (ej: usuario canceló), redirigir al frontend
    if (request.query.error) {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const errorParam = encodeURIComponent(
        request.query.error === 'access_denied'
          ? 'auth_cancelled'
          : 'google_error',
      );
      response.redirect(`${frontendUrl}/auth/callback?error=${errorParam}`);
      return false;
    }

    // Verificar si Google OAuth está configurado
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
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
