import { Request } from 'express';

/**
 * Usuario autenticado extraído del JWT token
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/**
 * Request de Express con usuario autenticado
 * Usar en controladores protegidos con JwtAuthGuard
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Request con usuario opcional (para guards que verifican antes de autenticación)
 */
export interface MaybeAuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
