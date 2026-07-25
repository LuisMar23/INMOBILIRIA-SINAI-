import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreateUrbanizacionDto } from './dto/create-urbanizacion.dto';
import { UpdateUrbanizacionDto } from './dto/update-urbanizacion.dto';
import * as fs from 'fs';
import * as path from 'path';
import { UserRole } from 'generated/prisma';

@Injectable()
export class UrbanizacionService {
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

  async create(createUrbanizacionDto: CreateUrbanizacionDto) {
    return this.prisma.$transaction(async (prisma) => {
      const urbanizacionExistente = await prisma.urbanizacion.findFirst({
        where: { nombre: createUrbanizacionDto.nombre },
      });

      if (urbanizacionExistente) {
        throw new BadRequestException(
          'Ya existe una urbanización con este nombre',
        );
      }

      if (createUrbanizacionDto.sedeId) {
        const sede = await prisma.sede.findUnique({
          where: { id: createUrbanizacionDto.sedeId },
        });
        if (!sede) {
          throw new BadRequestException('La sede especificada no existe');
        }
      }

      const urbanizacion = await prisma.urbanizacion.create({
        data: {
          nombre: createUrbanizacionDto.nombre,
          ubicacion: createUrbanizacionDto.ubicacion,
          ciudad: createUrbanizacionDto.ciudad,
          descripcion: createUrbanizacionDto.descripcion,
          maps: createUrbanizacionDto.maps,
          sedeId: createUrbanizacionDto.sedeId,
          superficieTotal: createUrbanizacionDto.superficieTotal,
          colindanciaNorte: createUrbanizacionDto.colindanciaNorte,
          colindanciaEste: createUrbanizacionDto.colindanciaEste,
          colindanciaSur: createUrbanizacionDto.colindanciaSur,
          colindanciaOeste: createUrbanizacionDto.colindanciaOeste,
        },
      });

      await this.crearAuditoria(
        undefined,
        'CREAR',
        'Urbanizacion',
        urbanizacion.id,
        null,
        urbanizacion,
      );

      return {
        success: true,
        message: 'Urbanización creada correctamente',
        data: urbanizacion,
      };
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    userId?: number,
    userRole?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userRole && userRole !== 'ADMINISTRADOR') {
      where.usuariosAsignados = {
        some: { usuarioId: userId },
      };
    }

    const [urbanizaciones, total] = await Promise.all([
      this.prisma.urbanizacion.findMany({
        where,
        skip,
        take: limit,
        include: {
          archivos: true,
          sede: { select: { id: true, nombre: true } },
          _count: { select: { lotes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.urbanizacion.count({ where }),
    ]);

    return {
      success: true,
      data: urbanizaciones,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const urbanizacion = await this.prisma.urbanizacion.findUnique({
      where: { id },
      include: {
        archivos: true,
        sede: true,
        lotes: {
          include: {
            _count: {
              select: {
                cotizaciones: true,
                ventas: true,
                reservas: true,
                archivos: true,
              },
            },
          },
        },
        _count: { select: { lotes: true } },
      },
    });

    if (!urbanizacion) {
      throw new NotFoundException(`Urbanización con ID ${id} no encontrada`);
    }

    return {
      success: true,
      data: urbanizacion,
    };
  }

  async findOneUUID(uuid: string) {
    const urbanizacion = await this.prisma.urbanizacion.findUnique({
      where: { uuid },
      include: {
        archivos: true,
        sede: true,
        lotes: {
          include: {
            archivos: true,
            _count: {
              select: {
                cotizaciones: true,
                ventas: true,
                reservas: true,
                archivos: true,
              },
            },
          },
        },
        _count: { select: { lotes: true } },
      },
    });

    if (!urbanizacion) {
      throw new NotFoundException(
        `Urbanización con UUID ${uuid} no encontrada`,
      );
    }

    return {
      success: true,
      data: urbanizacion,
    };
  }

  async update(id: number, updateUrbanizacionDto: UpdateUrbanizacionDto) {
    return this.prisma.$transaction(async (prisma) => {
      const urbanizacionExistente = await prisma.urbanizacion.findUnique({
        where: { id },
      });

      if (!urbanizacionExistente) {
        throw new NotFoundException(`Urbanización con ID ${id} no encontrada`);
      }

      if (updateUrbanizacionDto.sedeId) {
        const sede = await prisma.sede.findUnique({
          where: { id: updateUrbanizacionDto.sedeId },
        });
        if (!sede) {
          throw new BadRequestException('La sede especificada no existe');
        }
      }

      const datosAntes = { ...urbanizacionExistente };

      if (updateUrbanizacionDto.nombre) {
        const urbanizacionConMismoNombre = await prisma.urbanizacion.findFirst({
          where: {
            nombre: updateUrbanizacionDto.nombre,
            id: { not: id },
          },
        });
        if (urbanizacionConMismoNombre) {
          throw new BadRequestException(
            'Ya existe una urbanización con este nombre',
          );
        }
      }

      const dataToUpdate: any = {};

      if (updateUrbanizacionDto.nombre !== undefined)
        dataToUpdate.nombre = updateUrbanizacionDto.nombre;
      if (updateUrbanizacionDto.ubicacion !== undefined)
        dataToUpdate.ubicacion = updateUrbanizacionDto.ubicacion;
      if (updateUrbanizacionDto.ciudad !== undefined)
        dataToUpdate.ciudad = updateUrbanizacionDto.ciudad;
      if (updateUrbanizacionDto.descripcion !== undefined)
        dataToUpdate.descripcion = updateUrbanizacionDto.descripcion;
      if (updateUrbanizacionDto.maps !== undefined)
        dataToUpdate.maps = updateUrbanizacionDto.maps;
      if (updateUrbanizacionDto.sedeId !== undefined)
        dataToUpdate.sedeId = updateUrbanizacionDto.sedeId;
      if (updateUrbanizacionDto.superficieTotal !== undefined)
        dataToUpdate.superficieTotal = updateUrbanizacionDto.superficieTotal;
      if (updateUrbanizacionDto.colindanciaNorte !== undefined)
        dataToUpdate.colindanciaNorte = updateUrbanizacionDto.colindanciaNorte;
      if (updateUrbanizacionDto.colindanciaEste !== undefined)
        dataToUpdate.colindanciaEste = updateUrbanizacionDto.colindanciaEste;
      if (updateUrbanizacionDto.colindanciaSur !== undefined)
        dataToUpdate.colindanciaSur = updateUrbanizacionDto.colindanciaSur;
      if (updateUrbanizacionDto.colindanciaOeste !== undefined)
        dataToUpdate.colindanciaOeste = updateUrbanizacionDto.colindanciaOeste;

      const urbanizacionActualizada = await prisma.urbanizacion.update({
        where: { id },
        data: dataToUpdate,
      });

      await this.crearAuditoria(
        undefined,
        'ACTUALIZAR',
        'Urbanizacion',
        id,
        datosAntes,
        urbanizacionActualizada,
      );

      return {
        success: true,
        message: 'Urbanización actualizada correctamente',
        data: urbanizacionActualizada,
      };
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const urbanizacion = await prisma.urbanizacion.findUnique({
        where: { id },
        include: {
          archivos: true,
          lotes: {
            include: {
              archivos: true,
              cotizaciones: true,
              ventas: true,
              reservas: true,
            },
          },
        },
      });

      if (!urbanizacion) {
        throw new NotFoundException(`Urbanización con ID ${id} no encontrada`);
      }

      const datosAntes = { ...urbanizacion };

      for (const lote of urbanizacion.lotes) {
        const puedeEliminar =
          lote.estado === 'DISPONIBLE' || lote.estado === 'CON_OFERTA';
        const tieneOperaciones =
          lote.cotizaciones.length > 0 ||
          lote.ventas.length > 0 ||
          lote.reservas.length > 0;

        if (!puedeEliminar || tieneOperaciones) {
          continue;
        }

        for (const archivo of lote.archivos) {
          if (archivo.urlArchivo) {
            const filePath = path.join(process.cwd(), archivo.urlArchivo);
            try {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (err) {}
          }
        }

        await prisma.archivo.deleteMany({ where: { loteId: lote.id } });
        await prisma.lotePromocion.deleteMany({ where: { loteId: lote.id } });
        await prisma.lote.delete({ where: { id: lote.id } });
      }

      for (const archivo of urbanizacion.archivos) {
        if (archivo.urlArchivo) {
          const filePath = path.join(process.cwd(), archivo.urlArchivo);
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (err) {}
        }
      }

      await prisma.archivo.deleteMany({ where: { urbanizacionId: id } });
      await prisma.urbanizacion.delete({ where: { id } });

      await this.crearAuditoria(
        undefined,
        'ELIMINAR',
        'Urbanizacion',
        id,
        datosAntes,
        null,
      );

      return {
        success: true,
        message: 'Urbanización eliminada correctamente',
      };
    });
  }

  // ----- NUEVOS MÉTODOS PÚBLICOS -----
  async findAllPublic() {
    const urbanizaciones = await this.prisma.urbanizacion.findMany({
      include: {
        archivos: true,
        sede: { select: { id: true, nombre: true } },
        _count: { select: { lotes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: urbanizaciones,
    };
  }

  async findOneUUIDPublic(uuid: string) {
    const urbanizacion = await this.prisma.urbanizacion.findUnique({
      where: { uuid },
      include: {
        archivos: true,
        sede: true,
        lotes: {
          include: {
            archivos: true,
            _count: {
              select: {
                cotizaciones: true,
                ventas: true,
                reservas: true,
                archivos: true,
              },
            },
          },
        },
        _count: { select: { lotes: true } },
      },
    });

    if (!urbanizacion) {
      throw new NotFoundException(
        `Urbanización con UUID ${uuid} no encontrada`,
      );
    }

    return {
      success: true,
      data: urbanizacion,
    };
  }
}