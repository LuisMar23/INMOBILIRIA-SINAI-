import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CreateLoteDto, EstadoInmueble } from './dto/create-lote.dto';
import { UpdateLoteDto } from './dto/update-lote.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoteService {
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

  async create(createLoteDto: CreateLoteDto) {
    return this.prisma.$transaction(async (prisma) => {
      // if (!createLoteDto.esIndependiente && createLoteDto.urbanizacionId) {
      //   const urbanizacion = await prisma.urbanizacion.findUnique({
      //     where: { id: createLoteDto.urbanizacionId },
      //   });
      //   if (!urbanizacion) {
      //     throw new BadRequestException('Urbanización no encontrada');
      //   }
      //   if (createLoteDto.manzanoId) {
      //     const manzano = await prisma.manzano.findUnique({
      //       where: { id: createLoteDto.manzanoId },
      //     });
      //     if (!manzano) {
      //       throw new BadRequestException('Manzano no encontrado');
      //     }
      //     if (manzano.urbanizacionId !== createLoteDto.urbanizacionId) {
      //       throw new BadRequestException(
      //         'El manzano no pertenece a la urbanización seleccionada',
      //       );
      //     }
      //   }
      //   const loteExistente = await prisma.lote.findFirst({
      //     where: {
      //       urbanizacionId: createLoteDto.urbanizacionId,
      //       numeroLote: createLoteDto.numeroLote,
      //     },
      //   });
      //   if (loteExistente) {
      //     throw new BadRequestException(
      //       'El número de lote ya existe en esta urbanización',
      //     );
      //   }
      // }
if (!createLoteDto.esIndependiente && createLoteDto.urbanizacionId) {
  const urbanizacion = await prisma.urbanizacion.findUnique({
    where: { id: createLoteDto.urbanizacionId },
  });
  if (!urbanizacion) {
    throw new BadRequestException('Urbanización no encontrada');
  }
  if (createLoteDto.manzanoId) {
    const manzano = await prisma.manzano.findUnique({
      where: { id: createLoteDto.manzanoId },
    });
    if (!manzano) {
      throw new BadRequestException('Manzano no encontrado');
    }
    if (manzano.urbanizacionId !== createLoteDto.urbanizacionId) {
      throw new BadRequestException(
        'El manzano no pertenece a la urbanización seleccionada',
      );
    }
  }

  // 👇 Cambio clave: agregar manzanoId al filtro
  const loteExistente = await prisma.lote.findFirst({
    where: {
      urbanizacionId: createLoteDto.urbanizacionId,
      manzanoId: createLoteDto.manzanoId ?? null,
      numeroLote: createLoteDto.numeroLote,
    },
  });
  if (loteExistente) {
    throw new BadRequestException(
      'El número de lote ya existe en este manzano',
    );
  }
}
      if (createLoteDto.esIndependiente) {
        const loteIndependienteExistente = await prisma.lote.findFirst({
          where: {
            esIndependiente: true,
            numeroLote: createLoteDto.numeroLote,
            ciudad: createLoteDto.ciudad,
          },
        });
        if (loteIndependienteExistente) {
          throw new BadRequestException(
            'Ya existe un lote independiente con este número en la misma ciudad',
          );
        }
      }

      const lote = await prisma.lote.create({
        data: {
          urbanizacionId: createLoteDto.esIndependiente
            ? null
            : createLoteDto.urbanizacionId,
          numeroLote: createLoteDto.numeroLote,
          superficieM2: createLoteDto.superficieM2,
          precioBase: createLoteDto.precioBase,
          precioM2: createLoteDto.precioM2,
          estado: createLoteDto.estado || EstadoInmueble.DISPONIBLE,
          encargadoId: createLoteDto.encargadoId,
          descripcion: createLoteDto.descripcion,
          ubicacion: createLoteDto.ubicacion,
          ciudad: createLoteDto.ciudad,
          medidaFrente: createLoteDto.medidaFrente,
          medidaIzquierda: createLoteDto.medidaIzquierda,
          medidaDerecha: createLoteDto.medidaDerecha,
          medidaFondo: createLoteDto.medidaFondo,
          partida: createLoteDto.partida,
          colindaFrontal: createLoteDto.colindaFrontal,
          colindaDerecho: createLoteDto.colindaDerecho,
          colindaIzquierdo: createLoteDto.colindaIzquierdo,
          colindaFondo: createLoteDto.colindaFondo,
          esIndependiente: createLoteDto.esIndependiente,
          manzanoId: createLoteDto.manzanoId,
        },
        include: {
          urbanizacion: {
            select: { id: true, nombre: true, ubicacion: true, ciudad: true },
          },
          manzano: { select: { id: true, nombre: true } },
        },
      });

      await this.crearAuditoria(
        createLoteDto.usuarioId,
        'CREAR',
        'Lote',
        lote.id,
        null,
        lote,
      );

      return {
        success: true,
        message: 'Lote creado correctamente',
        data: lote,
      };
    });
  }

  async findAll(
    urbanizacionId?: number,
    usuarioId?: number,
    userRole?: string,
  ) {
    const where: any = {};
    if (urbanizacionId) {
      where.urbanizacionId = urbanizacionId;
    }
    if (userRole !== 'ADMINISTRADOR') {
      const asignaciones = await this.prisma.usuarioUrbanizacion.findMany({
        where: { usuarioId },
        select: { urbanizacionId: true },
      });
      const urbanizacionIds = asignaciones.map((a) => a.urbanizacionId);
      where.OR = [
        { urbanizacionId: { in: urbanizacionIds } },
        { esIndependiente: true },
      ];
    }

    const lotes = await this.prisma.lote.findMany({
      where,
      include: {
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
            ciudad: true,
            uuid: true,
          },
        },
        manzano: { select: { id: true, nombre: true } },
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
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
        _count: {
          select: {
            cotizaciones: true,
            ventas: true,
            reservas: true,
            visitas: true,
            archivos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const lotesConPrecioActual = lotes.map((lote) => {
      const promocionActiva = lote.LotePromocion[0];
      const precioActual = lote.precioBase;
      return {
        ...lote,
        precioActual,
        tienePromocionActiva: !!promocionActiva,
        promocionActiva: promocionActiva
          ? {
              id: promocionActiva.promocion.id,
              titulo: promocionActiva.promocion.titulo,
              descuento: promocionActiva.promocion.descuento,
              fechaFin: promocionActiva.promocion.fechaFin,
            }
          : null,
      };
    });

    return { success: true, data: lotesConPrecioActual };
  }

  async getLotesSinUrbanizacion() {
    return this.prisma.lote.findMany({
      where: { urbanizacionId: null },
      select: {
        id: true,
        uuid: true,
        numeroLote: true,
        manzanoId: true,
        ciudad: true,
        _count: { select: { ventas: true } },
      },
    });
  }

  async findAllPublicos() {
    const lotes = await this.prisma.lote.findMany({
      include: {
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        urbanizacion: {
          select: { id: true, nombre: true, ubicacion: true, ciudad: true },
        },
        manzano: { select: { id: true, nombre: true } },
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
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const lotesConPrecioActual = lotes.map((lote) => {
      const promocionActiva = lote.LotePromocion[0];
      const precioActual = lote.precioBase;
      return {
        ...lote,
        precioActual,
        tienePromocionActiva: !!promocionActiva,
        promocionActiva: promocionActiva
          ? {
              id: promocionActiva.promocion.id,
              titulo: promocionActiva.promocion.titulo,
              descuento: promocionActiva.promocion.descuento,
              fechaFin: promocionActiva.promocion.fechaFin,
            }
          : null,
      };
    });

    return { success: true, data: lotesConPrecioActual };
  }

  async findAllIndependientes() {
    const lotes = await this.prisma.lote.findMany({
      where: { esIndependiente: true },
      orderBy: { numeroLote: 'asc' },
    });
    return { success: true, data: lotes };
  }

  async findOne(id: number) {
    const lote = await this.prisma.lote.findUnique({
      where: { id },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            ciudad: true,
            descripcion: true,
          },
        },
        manzano: { select: { id: true, nombre: true } },
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
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
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
        cotizaciones: {
          select: {
            id: true,
            uuid: true,
            nombreCliente: true,
            contactoCliente: true,
            precioOfertado: true,
            estado: true,
            createdAt: true,
          },
        },
        visitas: {
          include: {
            cliente: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (!lote) throw new NotFoundException(`Lote con ID ${id} no encontrado`);

    const promocionActiva = lote.LotePromocion[0];
    const precioActual = lote.precioBase;
    const loteConPrecio = {
      ...lote,
      precioActual,
      tienePromocionActiva: !!promocionActiva,
      promocionActiva: promocionActiva
        ? {
            id: promocionActiva.promocion.id,
            titulo: promocionActiva.promocion.titulo,
            descuento: promocionActiva.promocion.descuento,
            fechaFin: promocionActiva.promocion.fechaFin,
          }
        : null,
    };
    return { success: true, data: loteConPrecio };
  }

  async findOneUUID(uuid: string) {
    const lote = await this.prisma.lote.findUnique({
      where: { uuid },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            ciudad: true,
            descripcion: true,
          },
        },
        manzano: { select: { id: true, nombre: true } },
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
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
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
        cotizaciones: {
          select: {
            id: true,
            uuid: true,
            nombreCliente: true,
            contactoCliente: true,
            precioOfertado: true,
            estado: true,
            createdAt: true,
          },
        },
        visitas: {
          include: {
            cliente: { select: { id: true, fullName: true, email: true } },
          },
        },
        encargado: {
          select: {
            id: true,
            uuid: true,
            fullName: true,
            email: true,
            telefono: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
    if (!lote)
      throw new NotFoundException(`Lote con UUID ${uuid} no encontrado`);

    const promocionActiva = lote.LotePromocion[0];
    const precioActual = lote.precioBase;
    const loteConPrecio = {
      ...lote,
      precioActual,
      tienePromocionActiva: !!promocionActiva,
      promocionActiva: promocionActiva
        ? {
            id: promocionActiva.promocion.id,
            titulo: promocionActiva.promocion.titulo,
            descuento: promocionActiva.promocion.descuento,
            fechaFin: promocionActiva.promocion.fechaFin,
          }
        : null,
    };
    return { success: true, data: loteConPrecio };
  }

  async update(id: number, updateLoteDto: UpdateLoteDto) {
    return this.prisma.$transaction(async (prisma) => {
      const loteExistente = await prisma.lote.findUnique({ where: { id } });
      if (!loteExistente)
        throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      const datosAntes = { ...loteExistente };

      if (updateLoteDto.urbanizacionId && !updateLoteDto.esIndependiente) {
        const urbanizacion = await prisma.urbanizacion.findUnique({
          where: { id: updateLoteDto.urbanizacionId },
        });
        if (!urbanizacion)
          throw new BadRequestException('Urbanización no encontrada');
      }

      // if (updateLoteDto.numeroLote) {
      //   let whereClause = {};
      //   if (updateLoteDto.esIndependiente) {
      //     whereClause = {
      //       esIndependiente: true,
      //       numeroLote: updateLoteDto.numeroLote,
      //       ciudad: updateLoteDto.ciudad || loteExistente.ciudad,
      //       id: { not: id },
      //     };
      //   } else {
      //     whereClause = {
      //       urbanizacionId:
      //         updateLoteDto.urbanizacionId || loteExistente.urbanizacionId,
      //       numeroLote: updateLoteDto.numeroLote,
      //       id: { not: id },
      //     };
      //   }
      //   const loteConMismoNumero = await prisma.lote.findFirst({
      //     where: whereClause,
      //   });
      //   if (loteConMismoNumero) {
      //     throw new BadRequestException(
      //       'El número de lote ya existe en esta urbanización/ciudad',
      //     );
      //   }
      // }
if (updateLoteDto.numeroLote) {
  let whereClause: any = {};
  if (updateLoteDto.esIndependiente) {
    whereClause = {
      esIndependiente: true,
      numeroLote: updateLoteDto.numeroLote,
      ciudad: updateLoteDto.ciudad || loteExistente.ciudad,
      id: { not: id },
    };
  } else {
    whereClause = {
      urbanizacionId: updateLoteDto.urbanizacionId || loteExistente.urbanizacionId,
      manzanoId: updateLoteDto.manzanoId ?? loteExistente.manzanoId ?? null,
      numeroLote: updateLoteDto.numeroLote,
      id: { not: id },
    };
  }
  const loteConMismoNumero = await prisma.lote.findFirst({
    where: whereClause,
  });
  if (loteConMismoNumero) {
    throw new BadRequestException(
      'El número de lote ya existe en este manzano',
    );
  }
}
      if (updateLoteDto.manzanoId) {
        const manzano = await prisma.manzano.findUnique({
          where: { id: updateLoteDto.manzanoId },
        });
        if (!manzano) throw new BadRequestException('Manzano no encontrado');
        const urbanizacionFinal =
          updateLoteDto.urbanizacionId || loteExistente.urbanizacionId;
        if (urbanizacionFinal && manzano.urbanizacionId !== urbanizacionFinal) {
          throw new BadRequestException(
            'El manzano no pertenece a la urbanización seleccionada',
          );
        }
      }

      const dataToUpdate: any = {
        numeroLote: updateLoteDto.numeroLote,
        superficieM2: updateLoteDto.superficieM2,
        precioBase: updateLoteDto.precioBase,
        precioM2: updateLoteDto.precioM2,
        estado: updateLoteDto.estado,
        descripcion: updateLoteDto.descripcion,
        ubicacion: updateLoteDto.ubicacion,
        ciudad: updateLoteDto.ciudad,
        medidaFrente: updateLoteDto.medidaFrente,
        medidaIzquierda: updateLoteDto.medidaIzquierda,
        medidaDerecha: updateLoteDto.medidaDerecha,
        medidaFondo: updateLoteDto.medidaFondo,
        partida: updateLoteDto.partida,
        colindaFrontal: updateLoteDto.colindaFrontal,
        colindaDerecho: updateLoteDto.colindaDerecho,
        colindaIzquierdo: updateLoteDto.colindaIzquierdo,
        colindaFondo: updateLoteDto.colindaFondo,
        esIndependiente: updateLoteDto.esIndependiente,
        urbanizacionId: updateLoteDto.esIndependiente
          ? null
          : updateLoteDto.urbanizacionId,
        manzanoId: updateLoteDto.manzanoId,
      };
      if ('encargadoId' in updateLoteDto)
        dataToUpdate.encargadoId = updateLoteDto.encargadoId;

      const loteActualizado = await prisma.lote.update({
        where: { id },
        data: dataToUpdate,
        include: {
          urbanizacion: {
            select: { id: true, nombre: true, ubicacion: true, ciudad: true },
          },
          manzano: { select: { id: true, nombre: true } },
          encargado: true,
        },
      });

      await this.crearAuditoria(
        updateLoteDto.usuarioId,
        'ACTUALIZAR',
        'Lote',
        id,
        datosAntes,
        loteActualizado,
      );
      return {
        success: true,
        message: 'Lote actualizado correctamente',
        data: loteActualizado,
      };
    });
  }

  async remove(id: number, usuarioId?: number) {
    return this.prisma.$transaction(async (prisma) => {
      const lote = await prisma.lote.findUnique({ where: { id } });
      if (!lote) throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      const datosAntes = { ...lote };

      const archivos = await prisma.archivo.findMany({
        where: { loteId: id },
      });
      for (const archivo of archivos) {
        if (archivo.urlArchivo) {
          const filePath = path.join(process.cwd(), archivo.urlArchivo);
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (err) {}
        }
      }
      await prisma.archivo.deleteMany({ where: { loteId: id } });
      await prisma.lotePromocion.deleteMany({ where: { loteId: id } });
      await prisma.cotizacion.deleteMany({ where: { lote: { id: id } } });
      await prisma.venta.deleteMany({ where: { lote: { id: id } } });
      await prisma.reserva.deleteMany({ where: { lote: { id: id } } });
      await prisma.visita.deleteMany({ where: { lote: { id: id } } });
      await prisma.lote.delete({ where: { id } });

      await this.crearAuditoria(
        usuarioId,
        'ELIMINAR',
        'Lote',
        id,
        datosAntes,
        null,
      );
      return { success: true, message: 'Lote eliminado correctamente' };
    });
  }

  async getLotesParaCotizacion() {
    const lotes = await this.prisma.lote.findMany({
      where: { estado: { in: ['DISPONIBLE', 'CON_OFERTA'] } },
      include: {
        urbanizacion: {
          select: { id: true, nombre: true, ubicacion: true, ciudad: true },
        },
        manzano: { select: { id: true, nombre: true } },
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
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
        _count: {
          select: { cotizaciones: { where: { estado: 'PENDIENTE' } } },
        },
      },
      orderBy: [{ urbanizacionId: 'asc' }, { numeroLote: 'asc' }],
    });

    const lotesParaCotizacion = lotes.map((lote) => {
      const promocionActiva = lote.LotePromocion[0];
      const precioActual = lote.precioBase;
      return {
        id: lote.id,
        uuid: lote.uuid,
        numeroLote: lote.numeroLote,
        superficieM2: lote.superficieM2,
        precioBase: lote.precioBase,
        precioActual,
        estado: lote.estado,
        descripcion: lote.descripcion,
        ubicacion: lote.ubicacion,
        ciudad: lote.ciudad,
        esIndependiente: lote.esIndependiente,
        tienePromocionActiva: !!promocionActiva,
        promocionActiva: promocionActiva
          ? {
              id: promocionActiva.promocion.id,
              titulo: promocionActiva.promocion.titulo,
              descuento: promocionActiva.promocion.descuento,
              fechaFin: promocionActiva.promocion.fechaFin,
            }
          : null,
        urbanizacion: lote.urbanizacion,
        cotizacionesPendientes: lote._count.cotizaciones,
        ahorro: promocionActiva
          ? Number(lote.precioBase) - Number(precioActual)
          : 0,
        porcentajeAhorro: promocionActiva
          ? Number(promocionActiva.promocion.descuento)
          : 0,
      };
    });
    return { success: true, data: lotesParaCotizacion };
  }

  async getLotesConPromociones() {
    const lotes = await this.prisma.lote.findMany({
      where: {
        estado: 'DISPONIBLE',
        LotePromocion: {
          some: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: new Date() },
              fechaFin: { gte: new Date() },
            },
          },
        },
      },
      include: {
        urbanizacion: {
          select: { id: true, nombre: true, ubicacion: true, ciudad: true },
        },
        manzano: { select: { id: true, nombre: true } },
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
                fechaInicio: true,
                fechaFin: true,
              },
            },
          },
        },
      },
    });
    const lotesConPromocion = lotes.map((lote) => ({
      ...lote,
      precioPromocional: lote.precioBase,
      promocion: lote.LotePromocion[0]?.promocion || null,
    }));
    return { success: true, data: lotesConPromocion };
  }

  async obtenerLotesConPromocion() {
    const hoy = new Date();
    return this.prisma.lote.findMany({
      where: {
        LotePromocion: {
          some: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: hoy },
              fechaFin: { gte: hoy },
            },
          },
        },
      },
      include: {
        LotePromocion: {
          where: {
            promocion: {
              isActive: true,
              fechaInicio: { lte: hoy },
              fechaFin: { gte: hoy },
            },
          },
          include: { promocion: true },
        },
        archivos: true,
        urbanizacion: true,
        manzano: true,
      },
    });
  }

  async asignarEncargado(
    loteId: number,
    encargadoId: number,
    usuarioId?: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const lote = await prisma.lote.findUnique({ where: { id: loteId } });
      if (!lote)
        throw new NotFoundException(`Lote con ID ${loteId} no encontrado`);
      const encargado = await prisma.user.findUnique({
        where: {
          id: encargadoId,
          role: { in: ['ASESOR', 'ADMINISTRADOR'] },
        },
      });
      if (!encargado)
        throw new BadRequestException(
          'Encargado no encontrado o no tiene permisos (solo ASESOR o ADMINISTRADOR)',
        );
      const datosAntes = { ...lote };
      const loteActualizado = await prisma.lote.update({
        where: { id: loteId },
        data: { encargadoId },
        include: {
          encargado: {
            select: {
              id: true,
              fullName: true,
              role: true,
              telefono: true,
              email: true,
            },
          },
          urbanizacion: {
            select: { id: true, nombre: true, ubicacion: true },
          },
          manzano: { select: { id: true, nombre: true } },
        },
      });
      await this.crearAuditoria(
        usuarioId,
        'ASIGNAR_ENCARGADO',
        'Lote',
        loteId,
        datosAntes,
        loteActualizado,
      );
      return {
        success: true,
        message: 'Encargado asignado correctamente al lote',
        data: loteActualizado,
      };
    });
  }

  async findAllUrba(
    page: number = 1,
    limit: number = 10,
    usuarioId: number,
    userRole?: string,
    ciudadAsignada?: string | null,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (userRole === 'ADMINISTRADOR') {
    } else if (userRole === 'SECRETARIA' && ciudadAsignada) {
      where.OR = [
        { ciudad: { equals: ciudadAsignada.trim(), mode: 'insensitive' } },
        { ubicacion: { equals: ciudadAsignada.trim(), mode: 'insensitive' } },
      ];
    } else {
      const asignaciones = await this.prisma.usuarioUrbanizacion.findMany({
        where: { usuarioId },
        select: { urbanizacionId: true },
      });
      const ids = asignaciones.map((a) => a.urbanizacionId);
      where.id = { in: ids };
    }
    const [urbanizaciones, total] = await Promise.all([
      this.prisma.urbanizacion.findMany({
        where,
        skip,
        take: limit,
        include: { archivos: true, _count: { select: { lotes: true } } },
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
}
