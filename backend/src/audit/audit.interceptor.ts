import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

interface AuditUser {
  id: string;
  email?: string;
}

interface AuditRequest extends Request {
  user?: AuditUser;
}

interface AuditResponse {
  id?: string;
  user?: { id: string };
}

// Acciones que deben ser logueadas automaticamente
const AUDITED_ACTIONS: Record<string, { action: string; entity: string }> = {
  // Auth
  'POST /api/auth/login': { action: 'login', entity: 'user' },
  'POST /api/auth/register': { action: 'register', entity: 'user' },
  'POST /api/auth/logout': { action: 'logout', entity: 'user' },
  'POST /api/auth/change-password': {
    action: 'change_password',
    entity: 'user',
  },

  // Users
  'PATCH /api/users/me': { action: 'update_profile', entity: 'user' },
  'DELETE /api/users/me': { action: 'delete_account', entity: 'user' },

  // Experiences
  'POST /api/experiences': { action: 'create', entity: 'experience' },
  'PATCH /api/experiences/:id': { action: 'update', entity: 'experience' },
  'DELETE /api/experiences/:id': { action: 'delete', entity: 'experience' },

  // Matches
  'POST /api/matches': { action: 'create', entity: 'match' },
  'POST /api/matches/:id/accept': { action: 'accept', entity: 'match' },
  'POST /api/matches/:id/reject': { action: 'reject', entity: 'match' },
  'POST /api/matches/:id/complete': { action: 'complete', entity: 'match' },
  'POST /api/matches/:id/cancel': { action: 'cancel', entity: 'match' },

  // Wallet
  'POST /api/wallet/topup': { action: 'topup', entity: 'wallet' },
  'POST /api/wallet/withdraw': { action: 'withdraw', entity: 'wallet' },

  // Admin
  'POST /api/admin/users/:id/ban': { action: 'admin_ban_user', entity: 'user' },
  'POST /api/admin/users/:id/unban': {
    action: 'admin_unban_user',
    entity: 'user',
  },
  'POST /api/admin/users/:id/strike': {
    action: 'admin_add_strike',
    entity: 'user',
  },
  'DELETE /api/admin/users/:id/strike': {
    action: 'admin_remove_strike',
    entity: 'user',
  },
  'POST /api/admin/users/:id/role': {
    action: 'admin_change_role',
    entity: 'user',
  },
  'DELETE /api/admin/users/:id': {
    action: 'admin_delete_user',
    entity: 'user',
  },
  'DELETE /api/admin/experiences/:id': {
    action: 'admin_delete_experience',
    entity: 'experience',
  },

  // Reports
  'POST /api/reports': { action: 'create', entity: 'report' },
  'PUT /api/admin/reports/:id/resolve': {
    action: 'admin_resolve',
    entity: 'report',
  },
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const { method, url, user, ip, headers } = request;

    // Normalizar URL para buscar en el mapa (remover query params y normalizar params)
    const normalizedUrl = this.normalizeUrl(method, url);
    const auditConfig = AUDITED_ACTIONS[normalizedUrl];

    if (!auditConfig) {
      return next.handle();
    }

    const startTime = Date.now();

    // Extract IP and user agent from headers
    const forwardedFor = headers['x-forwarded-for'];
    const realIp = headers['x-real-ip'];
    const ipAddress =
      ip ||
      (typeof forwardedFor === 'string' ? forwardedFor : undefined) ||
      (typeof realIp === 'string' ? realIp : undefined);
    const userAgent =
      typeof headers['user-agent'] === 'string'
        ? headers['user-agent']
        : undefined;

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Solo loguear si la respuesta fue exitosa
          const typedResponse = response as AuditResponse | null;
          const entityId = this.extractEntityId(
            request,
            typedResponse,
            auditConfig.entity,
          );

          this.auditService
            .log({
              userId: user?.id,
              action: auditConfig.action,
              entity: auditConfig.entity,
              entityId,
              data: {
                method,
                url,
                duration: Date.now() - startTime,
                responseStatus: 'success',
              },
              ipAddress,
              userAgent,
            })
            .catch((err: unknown) => {
              this.logger.error(
                'Error logging audit',
                err instanceof Error ? err.stack : String(err),
              );
            });
        },
        error: (error: Error) => {
          // Loguear tambien errores para acciones de seguridad
          if (
            auditConfig.action.includes('login') ||
            auditConfig.action.includes('admin')
          ) {
            this.auditService
              .log({
                userId: user?.id,
                action: `${auditConfig.action}_failed`,
                entity: auditConfig.entity,
                data: {
                  method,
                  url,
                  duration: Date.now() - startTime,
                  error: error.message,
                  responseStatus: 'error',
                },
                ipAddress,
                userAgent,
              })
              .catch((err: unknown) => {
                this.logger.error(
                  'Error logging audit',
                  err instanceof Error ? err.stack : String(err),
                );
              });
          }
        },
      }),
    );
  }

  private normalizeUrl(method: string, url: string): string {
    // Remover query params
    const urlWithoutQuery = url.split('?')[0];

    // Reemplazar UUIDs y IDs numericos con :id
    const normalizedPath = urlWithoutQuery
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:id',
      )
      .replace(/\/\d+/g, '/:id');

    return `${method} ${normalizedPath}`;
  }

  private extractEntityId(
    request: AuditRequest,
    response: AuditResponse | null,
    entity: string,
  ): string | undefined {
    // Intentar extraer el ID de los params
    const paramId = request.params?.id;
    if (typeof paramId === 'string') {
      return paramId;
    }

    // Para creaciones, el ID viene en la respuesta
    if (response?.id) {
      return response.id;
    }

    // Para login, el ID del usuario viene en la respuesta
    if (entity === 'user' && response?.user?.id) {
      return response.user.id;
    }

    return undefined;
  }
}
