import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserRole } from 'generated/prisma';
import { PrismaService } from 'src/config/prisma.service';

@Injectable()
export class SeguridadService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // MÓDULOS
  // ============================================================

  async getModulos() {
    try {
      const modulos = await this.prisma.modulo.findMany({
        where: { activo: true, padreId: null }, // solo padres
        include: {
          hijos: {
            where: { activo: true },
            orderBy: { nombre: 'asc' },
          },
        },
        orderBy: { nombre: 'asc' },
      });

      return { success: true, data: { modulos } };
    } catch {
      throw new InternalServerErrorException('Error al obtener módulos');
    }
  }

  // ============================================================
  // PERMISOS POR ROL
  // ============================================================

  async getPermisosPorRole(role: UserRole) {
    try {
      // Traemos todos los módulos activos con sus hijos
      const modulos = await this.prisma.modulo.findMany({
        where: { activo: true, padreId: null },
        include: {
          hijos: { where: { activo: true }, orderBy: { nombre: 'asc' } },
        },
        orderBy: { nombre: 'asc' },
      });

      // Traemos los permisos existentes para el rol
      const permisos = await this.prisma.permisoRole.findMany({
        where: { role },
      });

      const permisosMap = new Map(permisos.map((p) => [p.moduloId, p.tieneAcceso]));

      // Armamos la respuesta combinando módulos + permisos actuales
      const resultado = modulos.map((padre) => ({
        id: padre.id,
        clave: padre.clave,
        nombre: padre.nombre,
        tieneAcceso: permisosMap.get(padre.id) ?? false,
        hijos: padre.hijos.map((hijo) => ({
          id: hijo.id,
          clave: hijo.clave,
          nombre: hijo.nombre,
          tieneAcceso: permisosMap.get(hijo.id) ?? false,
        })),
      }));

      return { success: true, data: { role, modulos: resultado } };
    } catch {
      throw new InternalServerErrorException('Error al obtener permisos');
    }
  }

  async updatePermisosRole(
    role: UserRole,
    permisos: { moduloId: number; tieneAcceso: boolean }[],
  ) {
    try {
      const results = await Promise.all(
        permisos.map((p) =>
          this.prisma.permisoRole.upsert({
            where: { role_moduloId: { role, moduloId: p.moduloId } },
            update: { tieneAcceso: p.tieneAcceso },
            create: { role, moduloId: p.moduloId, tieneAcceso: p.tieneAcceso },
          }),
        ),
      );

      return {
        success: true,
        message: `Permisos actualizados para ${role}`,
        data: { permisos: results },
      };
    } catch {
      throw new InternalServerErrorException('Error al actualizar permisos');
    }
  }

  // ============================================================
  // PERMISOS DEL USUARIO ACTUAL (se llama al login)
  // ============================================================

  async getPermisosUsuario(role: UserRole) {
    try {
      const permisos = await this.prisma.permisoRole.findMany({
        where: { role, tieneAcceso: true }, // solo los que tienen acceso
        include: { modulo: true },
      });

      // { 'lotes': true, 'reportes.ventas': true, ... }
      const permisosMap = permisos.reduce(
        (acc, p) => {
          acc[p.modulo.clave] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );

      return { success: true, data: { role, permisos: permisosMap } };
    } catch {
      throw new InternalServerErrorException('Error al obtener permisos del usuario');
    }
  }

  // ============================================================
  // URBANIZACIONES POR USUARIO
  // ============================================================

  async getUrbanizacionesUsuario(usuarioId: number) {
    try {
      const usuario = await this.prisma.user.findUnique({
        where: { id: usuarioId },
        include: {
          urbanizacionesAsignadas: {
            include: { urbanizacion: true },
          },
        },
      });

      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      return {
        success: true,
        data: {
          urbanizaciones: usuario.urbanizacionesAsignadas.map((u) => u.urbanizacion),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al obtener urbanizaciones');
    }
  }

  async asignarUrbanizaciones(usuarioId: number, urbanizacionIds: number[]) {
    try {
      const usuario = await this.prisma.user.findUnique({ where: { id: usuarioId } });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      // Reemplaza todas las asignaciones
      await this.prisma.usuarioUrbanizacion.deleteMany({ where: { usuarioId } });

      if (urbanizacionIds.length > 0) {
        await this.prisma.usuarioUrbanizacion.createMany({
          data: urbanizacionIds.map((urbanizacionId) => ({ usuarioId, urbanizacionId })),
          skipDuplicates: true,
        });
      }

      const resultado = await this.prisma.usuarioUrbanizacion.findMany({
        where: { usuarioId },
        include: { urbanizacion: true },
      });

      return {
        success: true,
        message: 'Urbanizaciones asignadas correctamente',
        data: { urbanizaciones: resultado.map((r) => r.urbanizacion) },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al asignar urbanizaciones');
    }
  }

  async removerUrbanizacion(usuarioId: number, urbanizacionId: number) {
    try {
      await this.prisma.usuarioUrbanizacion.deleteMany({
        where: { usuarioId, urbanizacionId },
      });

      return { success: true, message: 'Urbanización removida correctamente' };
    } catch {
      throw new InternalServerErrorException('Error al remover urbanización');
    }
  }
}