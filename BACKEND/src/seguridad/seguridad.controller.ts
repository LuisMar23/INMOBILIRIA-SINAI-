import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Request,
} from '@nestjs/common';
import { SeguridadService } from './seguridad.service';
import { UserRole } from 'generated/prisma';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';


import { AdminGuard } from 'src/auth/guards/permisos/admin.guard';

@Controller('seguridad')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class SeguridadController {
  constructor(private readonly seguridadService: SeguridadService) {}

  // ============================================================
  // MÓDULOS — solo admin
  // ============================================================

  @Get('modulos')
  // @UseGuards(AdminGuard)
  async getModulos() {
    return this.seguridadService.getModulos();
  }

  // ============================================================
  // PERMISOS POR ROL — solo admin
  // ============================================================

  @Get('permisos/:role')
  // @UseGuards(AdminGuard)
  async getPermisosPorRole(@Param('role') role: UserRole) {
    return this.seguridadService.getPermisosPorRole(role);
  }

  @Put('permisos/:role')
  // @UseGuards(AdminGuard)
  async updatePermisosRole(
    @Param('role') role: UserRole,
    @Body() body: { permisos: { moduloId: number; tieneAcceso: boolean }[] },
  ) {
    return this.seguridadService.updatePermisosRole(role, body.permisos);
  }

  // ============================================================
  // PERMISOS PROPIOS — cualquier usuario autenticado
  // ============================================================

  @Get('mis-permisos')
  async getMisPermisos(@Request() req: any) {
    return this.seguridadService.getPermisosUsuario(req.user.role);
  }

  // ============================================================
  // URBANIZACIONES — admin gestiona, asesor ve las suyas
  // ============================================================

  @Get('mis-urbanizaciones')
  async getMisUrbanizaciones(@Request() req: any) {
    return this.seguridadService.getUrbanizacionesUsuario(req.user.id);
  }

  @Get('usuarios/:id/urbanizaciones')
  // @UseGuards(AdminGuard)
  async getUrbanizacionesUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.seguridadService.getUrbanizacionesUsuario(id);
  }

  @Put('usuarios/:id/urbanizaciones')
  // @UseGuards(AdminGuard)
  async asignarUrbanizaciones(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { urbanizacionIds: number[] },
  ) {
    return this.seguridadService.asignarUrbanizaciones(id, body.urbanizacionIds);
  }

  @Delete('usuarios/:id/urbanizaciones/:urbanizacionId')
  // @UseGuards(AdminGuard)
  async removerUrbanizacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('urbanizacionId', ParseIntPipe) urbanizacionId: number,
  ) {
    return this.seguridadService.removerUrbanizacion(id, urbanizacionId);
  }
}