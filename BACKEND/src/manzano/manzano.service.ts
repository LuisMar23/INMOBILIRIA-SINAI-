import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreateManzanoDto } from './dto/create-manzano.dto';
import { UpdateManzanoDto } from './dto/update-manzano.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ManzanoService {
  constructor(private prisma: PrismaService) {}

  private async crearAuditoria(
    usuarioId: number | undefined,
    accion: string,
    tablaAfectada: string,
    registroId: number,
    datosAntes?: any,
    datosDespues?: any,
  ) {
    await this.prisma.auditoria.create({
      data: {
        usuarioId: usuarioId || undefined,
        accion,
        tablaAfectada,
        registroId,
        datosAntes: datosAntes ? JSON.stringify(datosAntes) : null,
        datosDespues: datosDespues ? JSON.stringify(datosDespues) : null,
        ip: '127.0.0.1',
        dispositivo: 'API',
      },
    });
  }

  async create(createManzanoDto: CreateManzanoDto) {
    return this.prisma.$transaction(async (prisma) => {
      const urbanizacion = await prisma.urbanizacion.findUnique({
        where: { id: createManzanoDto.urbanizacionId },
      });
      if (!urbanizacion) {
        throw new BadRequestException('Urbanización no encontrada');
      }

      const existente = await prisma.manzano.findFirst({
        where: {
          nombre: createManzanoDto.nombre,
          urbanizacionId: createManzanoDto.urbanizacionId,
        },
      });
      if (existente) {
        throw new BadRequestException('Ya existe un manzano con ese nombre en esta urbanización');
      }

      const manzano = await prisma.manzano.create({
        data: {
          nombre: createManzanoDto.nombre,
          urbanizacionId: createManzanoDto.urbanizacionId,
        },
        include: { urbanizacion: true },
      });

      await this.crearAuditoria(
        createManzanoDto.usuarioId,
        'CREAR',
        'Manzano',
        manzano.id,
        null,
        manzano,
      );

      return { success: true, message: 'Manzano creado correctamente', data: manzano };
    });
  }

  async findAll(usuarioId: number, userRole: string) {
    let where: any = {};

    if (userRole !== 'ADMINISTRADOR') {
      const asignaciones = await this.prisma.usuarioUrbanizacion.findMany({
        where: { usuarioId },
        select: { urbanizacionId: true },
      });
      const urbanizacionIds = asignaciones.map(a => a.urbanizacionId);
      where.urbanizacionId = { in: urbanizacionIds };
    }

    const manzanos = await this.prisma.manzano.findMany({
      where,
      include: {
        urbanizacion: { select: { id: true, nombre: true, ciudad: true } },
        lotes: { select: { id: true, numeroLote: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: manzanos };
  }

  async findAllPublic() {
    const manzanos = await this.prisma.manzano.findMany({
      include: {
        urbanizacion: { select: { id: true, nombre: true, ciudad: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: manzanos };
  }

  async findByUrbanizacion(urbanizacionId: number) {
    const manzanos = await this.prisma.manzano.findMany({
      where: { urbanizacionId },
      include: { lotes: { select: { id: true, numeroLote: true } } },
    });
    return { success: true, data: manzanos };
  }

  async findOne(id: number) {
    const manzano = await this.prisma.manzano.findUnique({
      where: { id },
      include: {
        urbanizacion: true,
        lotes: { include: { archivos: true, urbanizacion: true } },
      },
    });
    if (!manzano) throw new NotFoundException(`Manzano con ID ${id} no encontrado`);
    return { success: true, data: manzano };
  }

  async findOneByUuid(uuid: string) {
    const manzano = await this.prisma.manzano.findUnique({
      where: { uuid },
      include: {
        urbanizacion: true,
        lotes: { include: { archivos: true, urbanizacion: true } },
      },
    });
    if (!manzano) throw new NotFoundException(`Manzano con UUID ${uuid} no encontrado`);
    return { success: true, data: manzano };
  }

  async update(id: number, updateManzanoDto: UpdateManzanoDto) {
    return this.prisma.$transaction(async (prisma) => {
      const existente = await prisma.manzano.findUnique({ where: { id } });
      if (!existente) throw new NotFoundException(`Manzano con ID ${id} no encontrado`);

      if (updateManzanoDto.urbanizacionId) {
        const urbanizacion = await prisma.urbanizacion.findUnique({
          where: { id: updateManzanoDto.urbanizacionId },
        });
        if (!urbanizacion) throw new BadRequestException('Urbanización no encontrada');
      }

      if (updateManzanoDto.nombre && updateManzanoDto.urbanizacionId) {
        const duplicado = await prisma.manzano.findFirst({
          where: {
            nombre: updateManzanoDto.nombre,
            urbanizacionId: updateManzanoDto.urbanizacionId,
            id: { not: id },
          },
        });
        if (duplicado) throw new BadRequestException('Ya existe un manzano con ese nombre en esta urbanización');
      }

      const actualizado = await prisma.manzano.update({
        where: { id },
        data: {
          nombre: updateManzanoDto.nombre,
          urbanizacionId: updateManzanoDto.urbanizacionId,
        },
        include: { urbanizacion: true },
      });

      await this.crearAuditoria(updateManzanoDto.usuarioId, 'ACTUALIZAR', 'Manzano', id, existente, actualizado);
      return { success: true, message: 'Manzano actualizado correctamente', data: actualizado };
    });
  }

  async remove(id: number, usuarioId?: number) {
    return this.prisma.$transaction(async (prisma) => {
      const manzano = await prisma.manzano.findUnique({ where: { id } });
      if (!manzano) throw new NotFoundException(`Manzano con ID ${id} no encontrado`);

      const lotes = await prisma.lote.findMany({ where: { manzanoId: id } });
      if (lotes.length > 0) {
        throw new BadRequestException('No se puede eliminar el manzano porque tiene lotes asociados');
      }

      await prisma.manzano.delete({ where: { id } });
      await this.crearAuditoria(usuarioId, 'ELIMINAR', 'Manzano', id, manzano, null);
      return { success: true, message: 'Manzano eliminado correctamente' };
    });
  }
}