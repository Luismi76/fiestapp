import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT opcional: si hay token válido, añade req.user.
 * Si no hay token o es inválido, deja pasar sin user.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(_err: any, user: TUser | false): TUser | null {
    // No lanzar error si no hay token
    return user || null;
  }
}
