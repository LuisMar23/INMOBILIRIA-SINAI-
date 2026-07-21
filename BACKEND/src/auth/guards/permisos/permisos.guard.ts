// // src/auth/guards/permisos.guard.ts
// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   ForbiddenException,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { PrismaService } from 'src/config/prisma.service';

// export const MODULO_KEY = 'modulo';
// export const ACCION_KEY = 'accion';

// export type AccionPermiso = 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar';

// @Injectable()
// export class PermisosGuard implements CanActivate {
//   constructor(
//     private reflector: Reflector,
//     private prisma: PrismaService,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const moduloClave = this.reflector.get<string>(MODULO_KEY, context.getHandler());
//     const accion = this.reflector.get<AccionPermiso>(ACCION_KEY, context.getHandler());

//     // Si no tiene decorador, deja pasar
//     if (!moduloClave || !accion) return true;

//     const request = context.switchToHttp().getRequest();
//     const user = request.user;

//     if (!user) throw new ForbiddenException('No autenticado');

//     // ADMINISTRADOR siempre pasa
//     if (user.role === 'ADMINISTRADOR') return true;

//     // Buscar módulo
//     const modulo = await this.prisma.modulo.findUnique({
//       where: { clave: moduloClave },
//     });

//     if (!modulo) throw new ForbiddenException('Módulo no encontrado');

//     // Buscar permiso del rol en ese módulo
//     const permiso = await this.prisma.permisoRole.findUnique({
//       where: { role_moduloId: { role: user.role, moduloId: modulo.id } },
//     });

//     // Si no hay permiso o la acción está en false
//     if (!permiso || !permiso[accion]) {
//       throw new ForbiddenException(
//         `No tienes permiso para realizar esta acción en ${modulo.nombre}`,
//       );
//     }

//     // Verificar también el módulo padre si existe
//     if (modulo.padreId) {
//       const permisoPadre = await this.prisma.permisoRole.findUnique({
//         where: { role_moduloId: { role: user.role, moduloId: modulo.padreId } },
//       });
//       if (!permisoPadre || !permisoPadre.puedeVer) {
//         throw new ForbiddenException(
//           `No tienes acceso a este módulo`,
//         );
//       }
//     }

//     return true;
//   }
// }