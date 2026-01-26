import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MaybeAuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<MaybeAuthenticatedRequest>();
    const user = request.user;

    if (!user?.userId) {
      throw new ForbiddenException('No autorizado');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    });

    if (!dbUser || dbUser.role !== 'admin') {
      throw new ForbiddenException(
        'Acceso denegado: se requiere rol de administrador',
      );
    }

    return true;
  }
}
