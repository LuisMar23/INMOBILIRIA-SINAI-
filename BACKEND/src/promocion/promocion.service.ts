import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';

@Injectable()
export class PromocionService {
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

  private validarFechasPromocion(fechaInicio: Date, fechaFin: Date): void {
    if (fechaInicio >= fechaFin) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }
  }

  private async verificarPromocionSuperpuesta(
    loteId: number,
    fechaInicio: Date,
    fechaFin: Date,
    promocionIdExcluir?: number,
  ): Promise<boolean> {
    const where: any = {
      loteId,
      promocion: {
        isActive: true,
        OR: [
          { fechaInicio: { lte: fechaFin }, fechaFin: { gte: fechaInicio } },
        ],
      },
    };
    if (promocionIdExcluir) {
      where.promocionId = { not: promocionIdExcluir };
    }
    const promocionExistente = await this.prisma.lotePromocion.findFirst({
      where,
    });
    return !!promocionExistente;
  }

  private async actualizarPrecioLote(loteId: number, nuevoPrecio: number) {
    await this.prisma.lote.update({
      where: { id: loteId },
      data: { precioBase: nuevoPrecio },
    });
  }

  private async aplicarPromocionALote(
    loteId: number,
    promocionId: number,
    descuento: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    const lote = await this.prisma.lote.findUnique({ where: { id: loteId } });
    if (!lote) {
      throw new BadRequestException(`Lote con ID ${loteId} no encontrado`);
    }

    if (!['DISPONIBLE', 'CON_OFERTA'].includes(lote.estado)) {
      throw new BadRequestException(
        `El lote ${lote.numeroLote} no está disponible para promociones`,
      );
    }

    const tienePromocionSuperpuesta = await this.verificarPromocionSuperpuesta(
      loteId,
      fechaInicio,
      fechaFin,
      promocionId,
    );

    if (tienePromocionSuperpuesta) {
      throw new BadRequestException(
        `El lote ${lote.numeroLote} ya tiene una promoción activa en las fechas seleccionadas`,
      );
    }

    const precioConDescuento = Number(lote.precioBase) * (1 - descuento / 100);

    const lotePromocion = await this.prisma.lotePromocion.upsert({
      where: { loteId_promocionId: { loteId, promocionId } },
      update: { precioConDescuento, precioOriginal: lote.precioBase },
      create: {
        loteId,
        promocionId,
        precioOriginal: lote.precioBase,
        precioConDescuento,
      },
    });

    await this.actualizarPrecioLote(loteId, precioConDescuento);

    return lotePromocion;
  }

  private async removerPromocionDeLote(loteId: number, promocionId: number) {
    const lotePromocion = await this.prisma.lotePromocion.findUnique({
      where: { loteId_promocionId: { loteId, promocionId } },
    });

    if (lotePromocion) {
      const lote = await this.prisma.lote.findUnique({
        where: { id: loteId },
      });

      if (lote && ['DISPONIBLE', 'CON_OFERTA'].includes(lote.estado)) {
        await this.actualizarPrecioLote(
          loteId,
          Number(lotePromocion.precioOriginal),
        );
      }

      await this.prisma.lotePromocion.delete({
        where: { loteId_promocionId: { loteId, promocionId } },
      });
    }
  }

  private async removerPromocionDeLotes(promocionId: number) {
    const lotesPromocion = await this.prisma.lotePromocion.findMany({
      where: { promocionId },
    });

    for (const lotePromocion of lotesPromocion) {
      await this.removerPromocionDeLote(lotePromocion.loteId, promocionId);
    }
  }

  async create(createPromocionDto: CreatePromocionDto) {
    return this.prisma.$transaction(async (prisma) => {
      const fechaInicio = new Date(createPromocionDto.fechaInicio);
      const fechaFin = new Date(createPromocionDto.fechaFin);
      this.validarFechasPromocion(fechaInicio, fechaFin);

      const metodosAplicacion = [
        createPromocionDto.lotesIds && createPromocionDto.lotesIds.length > 0,
        createPromocionDto.urbanizacionId,
        createPromocionDto.aplicarATodos,
      ].filter(Boolean).length;

      if (metodosAplicacion > 1) {
        throw new BadRequestException(
          'Solo se puede usar un método de aplicación: lotes específicos, urbanización o todos los lotes',
        );
      }

      const promocion = await prisma.promocion.create({
        data: {
          titulo: createPromocionDto.titulo,
          descripcion: createPromocionDto.descripcion,
          descuento: createPromocionDto.descuento,
          fechaInicio,
          fechaFin,
          urbanizacionId: createPromocionDto.urbanizacionId,
          aplicadaATodos: createPromocionDto.aplicarATodos || false,
        },
      });

      if (createPromocionDto.aplicarATodos) {
        await this.asignarTodosLotesAPromocion(
          promocion.id,
          createPromocionDto.usuarioId,
        );
      } else if (createPromocionDto.urbanizacionId) {
        await this.asignarUrbanizacionAPromocion(
          promocion.id,
          createPromocionDto.urbanizacionId,
          createPromocionDto.usuarioId,
        );
      } else if (
        createPromocionDto.lotesIds &&
        createPromocionDto.lotesIds.length > 0
      ) {
        await this.asignarLotesAPromocion(
          promocion.id,
          createPromocionDto.lotesIds,
          createPromocionDto.usuarioId,
        );
      }

      await this.crearAuditoria(
        createPromocionDto.usuarioId,
        'CREAR',
        'Promocion',
        promocion.id,
        null,
        promocion,
      );

      return {
        success: true,
        message: 'Promoción creada correctamente',
        data: promocion,
      };
    });
  }

  async findAll() {
    const promociones = await this.prisma.promocion.findMany({
      include: {
        urbanizacion: { select: { id: true, nombre: true } },
        lotesAfectados: {
          include: {
            lote: {
              select: {
                id: true,
                numeroLote: true,
                precioBase: true,
                estado: true,
                urbanizacion: { select: { nombre: true } },
              },
            },
          },
        },
        _count: { select: { lotesAfectados: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: promociones };
  }

  async findAllPublicas() {
    const ahora = new Date();
    const promociones = await this.prisma.promocion.findMany({
      where: {
        isActive: true,
        fechaInicio: { lte: ahora },
        fechaFin: { gte: ahora },
      },
      include: {
        urbanizacion: { 
          select: { 
            id: true, 
            nombre: true,
            ubicacion: true,
            ciudad: true 
          } 
        },
        lotesAfectados: {
          include: {
            lote: {
              select: {
                id: true,
                uuid: true,
                numeroLote: true,
                precioBase: true,
                estado: true,
                superficieM2: true,
                ubicacion: true,
                ciudad: true,
                manzano: true,
                archivos: {
                  select: {
                    id: true,
                    urlArchivo: true,
                    tipoArchivo: true,
                    nombreArchivo: true,
                  },
                },
                urbanizacion: { 
                  select: { 
                    id: true, 
                    nombre: true,
                    ubicacion: true,
                    ciudad: true 
                  } 
                },
              },
            },
          },
        },
        _count: { select: { lotesAfectados: true } },
      },
      orderBy: { fechaFin: 'asc' },
    });

    const promocionesConPrecios = promociones.map((promocion) => {
      const lotesConPrecioActual = promocion.lotesAfectados.map((lp) => ({
        ...lp.lote,
        precioOriginal: lp.precioOriginal,
        precioConDescuento: lp.precioConDescuento,
        descuentoAplicado: promocion.descuento,
      }));

      return {
        ...promocion,
        lotesAfectados: lotesConPrecioActual,
        totalLotes: promocion._count.lotesAfectados,
      };
    });

    return {
      success: true,
      data: promocionesConPrecios,
    };
  }

  async findOne(id: number) {
    const promocion = await this.prisma.promocion.findUnique({
      where: { id },
      include: {
        urbanizacion: { select: { id: true, nombre: true } },
        lotesAfectados: {
          include: {
            lote: {
              select: {
                id: true,
                numeroLote: true,
                precioBase: true,
                estado: true,
                urbanizacion: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    if (!promocion) {
      throw new NotFoundException(`Promoción con ID ${id} no encontrada`);
    }

    return { success: true, data: promocion };
  }

  async update(id: number, updatePromocionDto: UpdatePromocionDto) {
    return this.prisma.$transaction(async (prisma) => {
      const promocionExistente = await prisma.promocion.findUnique({
        where: { id },
        include: { lotesAfectados: true },
      });

      if (!promocionExistente) {
        throw new NotFoundException(`Promoción con ID ${id} no encontrada`);
      }

      const datosAntes = { ...promocionExistente };
      const dataToUpdate: any = {};

      if (updatePromocionDto.titulo !== undefined) {
        dataToUpdate.titulo = updatePromocionDto.titulo;
      }

      if (updatePromocionDto.descripcion !== undefined) {
        dataToUpdate.descripcion = updatePromocionDto.descripcion;
      }

      let fechaInicio = promocionExistente.fechaInicio;
      let fechaFin = promocionExistente.fechaFin;

      if (updatePromocionDto.fechaInicio) {
        fechaInicio = new Date(updatePromocionDto.fechaInicio);
        dataToUpdate.fechaInicio = fechaInicio;
      }

      if (updatePromocionDto.fechaFin) {
        fechaFin = new Date(updatePromocionDto.fechaFin);
        dataToUpdate.fechaFin = fechaFin;
      }

      if (updatePromocionDto.fechaInicio || updatePromocionDto.fechaFin) {
        this.validarFechasPromocion(fechaInicio, fechaFin);
      }

      if (updatePromocionDto.urbanizacionId !== undefined) {
        dataToUpdate.urbanizacionId = updatePromocionDto.urbanizacionId;
      }

      if (updatePromocionDto.aplicarATodos !== undefined) {
        dataToUpdate.aplicadaATodos = updatePromocionDto.aplicarATodos;
      }

      if (updatePromocionDto.descuento !== undefined) {
        dataToUpdate.descuento = updatePromocionDto.descuento;

        for (const lotePromocion of promocionExistente.lotesAfectados) {
          const lote = await prisma.lote.findUnique({
            where: { id: lotePromocion.loteId },
          });

          if (lote && ['DISPONIBLE', 'CON_OFERTA'].includes(lote.estado)) {
            const nuevoPrecio =
              Number(lotePromocion.precioOriginal) *
              (1 - updatePromocionDto.descuento / 100);

            await prisma.lotePromocion.update({
              where: {
                loteId_promocionId: {
                  loteId: lotePromocion.loteId,
                  promocionId: id,
                },
              },
              data: { precioConDescuento: nuevoPrecio },
            });

            await this.actualizarPrecioLote(lotePromocion.loteId, nuevoPrecio);
          }
        }
      }

      const promocionActualizada = await prisma.promocion.update({
        where: { id },
        data: dataToUpdate,
      });

      await this.crearAuditoria(
        updatePromocionDto.usuarioId,
        'ACTUALIZAR',
        'Promocion',
        id,
        datosAntes,
        promocionActualizada,
      );

      return {
        success: true,
        message: 'Promoción actualizada correctamente',
        data: promocionActualizada,
      };
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id },
        include: { lotesAfectados: true },
      });

      if (!promocion) {
        throw new NotFoundException(`Promoción con ID ${id} no encontrada`);
      }

      const datosAntes = { ...promocion };

      for (const lotePromocion of promocion.lotesAfectados) {
        await this.removerPromocionDeLote(lotePromocion.loteId, id);
      }

      await prisma.promocion.delete({ where: { id } });

      await this.crearAuditoria(
        undefined,
        'ELIMINAR',
        'Promocion',
        id,
        datosAntes,
        null,
      );

      return {
        success: true,
        message: 'Promoción eliminada correctamente',
      };
    });
  }

  async getLotesDisponibles() {
    const lotes = await this.prisma.lote.findMany({
      where: { estado: 'DISPONIBLE' },
      include: {
        urbanizacion: { select: { id: true, nombre: true } },
        LotePromocion: {
          where: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: new Date() },
              fechaFin: { gte: new Date() },
            },
          },
          include: {
            promocion: {
              select: {
                id: true,
                titulo: true,
                descuento: true,
                fechaFin: true,
              },
            },
          },
        },
      },
    });

    const lotesConInfoPromocion = lotes.map((lote) => ({
      ...lote,
      tienePromocionActiva: lote.LotePromocion.length > 0,
      promocionActiva: lote.LotePromocion[0]?.promocion || null,
    }));

    return { success: true, data: lotesConInfoPromocion };
  }

  async asignarLotesAPromocion(
    promocionId: number,
    lotesIds: number[],
    usuarioId?: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id: promocionId },
      });

      if (!promocion) {
        throw new NotFoundException(
          `Promoción con ID ${promocionId} no encontrada`,
        );
      }

      await this.removerPromocionDeLotes(promocionId);

      const lotesExistentes = await prisma.lote.findMany({
        where: { id: { in: lotesIds }, estado: 'DISPONIBLE' },
      });

      if (lotesExistentes.length !== lotesIds.length) {
        throw new BadRequestException(
          'Uno o más lotes no existen o no están disponibles',
        );
      }

      const lotesAsignados: any[] = [];
      const errores: any[] = [];

      for (const lote of lotesExistentes) {
        try {
          const lotePromocion = await this.aplicarPromocionALote(
            lote.id,
            promocionId,
            Number(promocion.descuento),
            promocion.fechaInicio,
            promocion.fechaFin,
          );
          lotesAsignados.push(lotePromocion);
        } catch (error: any) {
          errores.push({
            loteId: lote.id,
            numeroLote: lote.numeroLote,
            error: error.message,
          });
        }
      }

      await prisma.promocion.update({
        where: { id: promocionId },
        data: { urbanizacionId: null, aplicadaATodos: false },
      });

      await this.crearAuditoria(
        usuarioId,
        'ASIGNAR_LOTES_PROMOCION',
        'Promocion',
        promocionId,
        null,
        {
          promocionId,
          lotesIds,
          lotesAsignados: lotesAsignados.length,
          errores,
        },
      );

      return {
        success: true,
        message: `Promoción asignada a ${lotesAsignados.length} lotes correctamente`,
        data: {
          promocionId,
          lotesAsignados: lotesAsignados.length,
          errores: errores.length > 0 ? errores : undefined,
        },
      };
    });
  }

  async removerLotesDePromocion(
    promocionId: number,
    lotesIds: number[],
    usuarioId?: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id: promocionId },
      });

      if (!promocion) {
        throw new NotFoundException(
          `Promoción con ID ${promocionId} no encontrada`,
        );
      }

      for (const loteId of lotesIds) {
        await this.removerPromocionDeLote(loteId, promocionId);
      }

      await this.crearAuditoria(
        usuarioId,
        'REMOVER_LOTES_PROMOCION',
        'Promocion',
        promocionId,
        null,
        { promocionId, lotesIds },
      );

      return {
        success: true,
        message: `Lotes removidos de la promoción correctamente`,
        data: { promocionId, lotesRemovidos: lotesIds.length },
      };
    });
  }

  async asignarUrbanizacionAPromocion(
    promocionId: number,
    urbanizacionId: number,
    usuarioId?: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id: promocionId },
      });

      if (!promocion) {
        throw new NotFoundException(
          `Promoción con ID ${promocionId} no encontrada`,
        );
      }

      const urbanizacion = await prisma.urbanizacion.findUnique({
        where: { id: urbanizacionId },
        include: { lotes: { where: { estado: 'DISPONIBLE' } } },
      });

      if (!urbanizacion) {
        throw new BadRequestException('Urbanización no encontrada');
      }

      await this.removerPromocionDeLotes(promocionId);

      const lotesAsignados: any[] = [];
      const errores: any[] = [];

      for (const lote of urbanizacion.lotes) {
        try {
          const lotePromocion = await this.aplicarPromocionALote(
            lote.id,
            promocionId,
            Number(promocion.descuento),
            promocion.fechaInicio,
            promocion.fechaFin,
          );
          lotesAsignados.push(lotePromocion);
        } catch (error: any) {
          errores.push({
            loteId: lote.id,
            numeroLote: lote.numeroLote,
            error: error.message,
          });
        }
      }

      await prisma.promocion.update({
        where: { id: promocionId },
        data: { urbanizacionId, aplicadaATodos: false },
      });

      await this.crearAuditoria(
        usuarioId,
        'ASIGNAR_URBANIZACION_PROMOCION',
        'Promocion',
        promocionId,
        null,
        {
          promocionId,
          urbanizacionId,
          lotesAsignados: lotesAsignados.length,
          errores,
        },
      );

      return {
        success: true,
        message: `Urbanización asignada a la promoción correctamente. ${lotesAsignados.length} lotes afectados.`,
        data: {
          promocionId,
          urbanizacionId,
          lotesAsignados: lotesAsignados.length,
          errores: errores.length > 0 ? errores : undefined,
        },
      };
    });
  }

  async asignarTodosLotesAPromocion(promocionId: number, usuarioId?: number) {
    return this.prisma.$transaction(async (prisma) => {
      const promocion = await prisma.promocion.findUnique({
        where: { id: promocionId },
      });

      if (!promocion) {
        throw new NotFoundException(
          `Promoción con ID ${promocionId} no encontrada`,
        );
      }

      const todosLotes = await prisma.lote.findMany({
        where: { estado: 'DISPONIBLE' },
      });

      await this.removerPromocionDeLotes(promocionId);

      const lotesAsignados: any[] = [];
      const errores: any[] = [];

      for (const lote of todosLotes) {
        try {
          const lotePromocion = await this.aplicarPromocionALote(
            lote.id,
            promocionId,
            Number(promocion.descuento),
            promocion.fechaInicio,
            promocion.fechaFin,
          );
          lotesAsignados.push(lotePromocion);
        } catch (error: any) {
          errores.push({
            loteId: lote.id,
            numeroLote: lote.numeroLote,
            error: error.message,
          });
        }
      }

      await prisma.promocion.update({
        where: { id: promocionId },
        data: { urbanizacionId: null, aplicadaATodos: true },
      });

      await this.crearAuditoria(
        usuarioId,
        'ASIGNAR_TODOS_LOTES_PROMOCION',
        'Promocion',
        promocionId,
        null,
        { promocionId, lotesAsignados: lotesAsignados.length, errores },
      );

      return {
        success: true,
        message: `Promoción aplicada a ${lotesAsignados.length} lotes disponibles`,
        data: {
          promocionId,
          lotesAsignados: lotesAsignados.length,
          errores: errores.length > 0 ? errores : undefined,
        },
      };
    });
  }

  async verificarPromocionesExpiradas() {
    const ahora = new Date();

    const promocionesExpiradas = await this.prisma.promocion.findMany({
      where: { fechaFin: { lt: ahora }, isActive: true },
      include: { lotesAfectados: true },
    });

    let totalLotesActualizados = 0;

    for (const promocion of promocionesExpiradas) {
      await this.prisma.$transaction(async (prisma) => {
        for (const lotePromocion of promocion.lotesAfectados) {
          const lote = await prisma.lote.findUnique({
            where: { id: lotePromocion.loteId },
          });

          if (lote && ['DISPONIBLE', 'CON_OFERTA'].includes(lote.estado)) {
            await this.actualizarPrecioLote(
              lotePromocion.loteId,
              Number(lotePromocion.precioOriginal),
            );
            totalLotesActualizados++;
          }

          await prisma.lotePromocion.delete({
            where: {
              loteId_promocionId: {
                loteId: lotePromocion.loteId,
                promocionId: promocion.id,
              },
            },
          });
        }

        await prisma.promocion.update({
          where: { id: promocion.id },
          data: { isActive: false },
        });
      });
    }

    return {
      success: true,
      message: `Se procesaron ${promocionesExpiradas.length} promociones expiradas y se actualizaron ${totalLotesActualizados} lotes`,
      data: {
        promocionesProcesadas: promocionesExpiradas.length,
        lotesActualizados: totalLotesActualizados,
      },
    };
  }

  async getPromocionesActivas() {
    const ahora = new Date();
    const promocionesActivas = await this.prisma.promocion.findMany({
      where: {
        isActive: true,
        fechaInicio: { lte: ahora },
        fechaFin: { gte: ahora },
      },
      include: {
        urbanizacion: { select: { id: true, nombre: true } },
        lotesAfectados: {
          include: {
            lote: {
              select: {
                id: true,
                numeroLote: true,
                precioBase: true,
                estado: true,
                urbanizacion: { select: { nombre: true } },
              },
            },
          },
        },
        _count: { select: { lotesAfectados: true } },
      },
      orderBy: { fechaFin: 'asc' },
    });

    return { success: true, data: promocionesActivas };
  }

  async getLotesConPromocionActiva(promocionId: number) {
    const promocion = await this.prisma.promocion.findUnique({
      where: { id: promocionId },
      include: {
        lotesAfectados: {
          include: {
            lote: {
              include: { urbanizacion: { select: { nombre: true } } },
            },
          },
        },
      },
    });

    if (!promocion) {
      throw new NotFoundException(
        `Promoción con ID ${promocionId} no encontrada`,
      );
    }

    return { success: true, data: promocion.lotesAfectados };
  }
}