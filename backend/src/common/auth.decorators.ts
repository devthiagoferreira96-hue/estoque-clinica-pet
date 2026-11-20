import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Papel } from './enums';

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

export const IS_PUBLIC = 'isPublic';
/** Rota liberada sem login (ex.: /auth/login) */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = 'roles';
/** Restringe a rota a determinados papéis */
export const Roles = (...papeis: Papel[]) => SetMetadata(ROLES, papeis);

/** Injeta o usuário logado (o "responsável") no controller */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioLogado => ctx.switchToHttp().getRequest().user,
);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(ctx: ExecutionContext) {
    const publica = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (publica) return true;
    return super.canActivate(ctx);
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const papeis = this.reflector.getAllAndOverride<Papel[]>(ROLES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!papeis || papeis.length === 0) return true;
    const user = ctx.switchToHttp().getRequest().user as UsuarioLogado | undefined;
    return !!user && papeis.includes(user.papel);
  }
}
