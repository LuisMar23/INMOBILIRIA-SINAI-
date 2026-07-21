import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

@Injectable()
export class SedeService {
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

  async create(createSedeDto: CreateSedeDto) {
    return this.prisma.$transaction(async (prisma) => {
      const existente = await prisma.sede.findFirst({
        where: { nombre: createSedeDto.nombre },
      });
      if (existente) {
        throw new BadRequestException('Ya existe una sede con ese nombre');
      }

      const sede = await prisma.sede.create({
        data: {
          nombre: createSedeDto.nombre,
          direccion: createSedeDto.direccion,
          telefono: createSedeDto.telefono,
        },
      });

      await this.crearAuditoria(
        createSedeDto.usuarioId,
        'CREAR',
        'Sede',
        sede.id,
        null,
        sede,
      );

      return {
        success: true,
        message: 'Sede creada correctamente',
        data: sede,
      };
    });
  }

  async findAll(usuarioId: number, userRole: string) {
    const sedes = await this.prisma.sede.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: sedes };
  }

  async findAllPublic() {
    const sedes = await this.prisma.sede.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: sedes };
  }

  async findOne(id: number) {
    const sede = await this.prisma.sede.findUnique({
      where: { id },
    });
    if (!sede) throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    return { success: true, data: sede };
  }

  async findOneByUuid(uuid: string) {
    const sede = await this.prisma.sede.findUnique({
      where: { uuid },
    });
    if (!sede)
      throw new NotFoundException(`Sede con UUID ${uuid} no encontrada`);
    return { success: true, data: sede };
  }

  async update(id: number, updateSedeDto: UpdateSedeDto) {
    return this.prisma.$transaction(async (prisma) => {
      const existente = await prisma.sede.findUnique({ where: { id } });
      if (!existente)
        throw new NotFoundException(`Sede con ID ${id} no encontrada`);

      if (updateSedeDto.nombre) {
        const duplicado = await prisma.sede.findFirst({
          where: {
            nombre: updateSedeDto.nombre,
            id: { not: id },
          },
        });
        if (duplicado)
          throw new BadRequestException('Ya existe otra sede con ese nombre');
      }

      const actualizado = await prisma.sede.update({
        where: { id },
        data: {
          nombre: updateSedeDto.nombre,
          direccion: updateSedeDto.direccion,
          telefono: updateSedeDto.telefono,
        },
      });

      await this.crearAuditoria(
        updateSedeDto.usuarioId,
        'ACTUALIZAR',
        'Sede',
        id,
        existente,
        actualizado,
      );
      return {
        success: true,
        message: 'Sede actualizada correctamente',
        data: actualizado,
      };
    });
  }

  async remove(id: number, usuarioId?: number) {
    return this.prisma.$transaction(async (prisma) => {
      const sede = await prisma.sede.findUnique({ where: { id } });
      if (!sede) throw new NotFoundException(`Sede con ID ${id} no encontrada`);

      await prisma.sede.delete({ where: { id } });
      await this.crearAuditoria(usuarioId, 'ELIMINAR', 'Sede', id, sede, null);
      return { success: true, message: 'Sede eliminada correctamente' };
    });
  }
}
