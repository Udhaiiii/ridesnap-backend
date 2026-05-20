import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from './auth.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata('isPublic', true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No role requirement = open route (matches legacy Express API)
    if (isPublic || !roles?.length) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token =
      (req.headers['x-auth-token'] as string) ||
      (req.query['token'] as string);

    const user = await this.auth.verifyToken(token);
    if (!user) throw new UnauthorizedException('Invalid or expired session');

    if (user.role !== 'admin' && !roles.includes(user.role)) {
      throw new UnauthorizedException('Insufficient permissions');
    }

    req.user = user;
    return true;
  }
}
