import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

interface ErrorResponse {
  message?: string;
  statusCode?: number;
}

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Solo enviar a Sentry errores 500+ (errores del servidor)
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag('status_code', status.toString());
        scope.setExtra('url', request.url);
        scope.setExtra('method', request.method);
        scope.setExtra('body', request.body);
        scope.setExtra('query', request.query);
        scope.setExtra('params', request.params);

        // Añadir usuario si está autenticado
        const user = request.user;
        if (user) {
          scope.setUser({
            id: user.userId,
            email: user.email,
          });
        }

        Sentry.captureException(exception);
      });
    }

    // Respuesta de error estructurada
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as ErrorResponse).message || JSON.stringify(message),
    };

    response.status(status).json(errorResponse);
  }
}
