import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateCotizacionDto,
  EstadoCotizacion,
  TipoInmueble,
} from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';

@Injectable()
export class CotizacionService {
  constructor(private prisma: PrismaService) {}

  private async crearAuditoria(
    usuarioId: number,
    accion: string,
    tablaAfectada: string,
    registroId: number,
    datosAntes?: any,
    datosDespues?: any,
  ) {
    try {
      await this.prisma.auditoria.create({
        data: {
          usuarioId: usuarioId,
          accion,
          tablaAfectada,
          registroId,
          datosAntes: datosAntes ? JSON.stringify(datosAntes) : null,
          datosDespues: datosDespues ? JSON.stringify(datosDespues) : null,
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });
    } catch (error) {}
  }

  async create(createCotizacionDto: CreateCotizacionDto, usuarioId: number) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const usuario = await prisma.user.findFirst({
          where: { id: usuarioId, isActive: true },
        });

        if (!usuario) {
          throw new ForbiddenException('Usuario no encontrado o inactivo');
        }

        let loteInfo: any = null;
        let precioReferencia: number = 0;

        if (createCotizacionDto.inmuebleTipo === TipoInmueble.LOTE) {
          const lote = await prisma.lote.findFirst({
            where: {
              id: createCotizacionDto.inmuebleId,
              estado: { in: ['DISPONIBLE', 'CON_OFERTA'] },
              encargadoId: usuarioId,
            },
            include: {
              urbanizacion: {
                select: {
                  id: true,
                  nombre: true,
                  ubicacion: true,
                  ciudad: true,
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
                    },
                  },
                },
              },
            },
          });

          if (!lote) {
            throw new BadRequestException('Lote no encontrado, no está disponible o no eres el encargado');
          }

          const promocionActiva = lote.LotePromocion[0];
          precioReferencia = promocionActiva
            ? Number(promocionActiva.precioConDescuento)
            : Number(lote.precioBase);

          loteInfo = {
            id: lote.id,
            numeroLote: lote.numeroLote,
            superficieM2: Number(lote.superficieM2),
            precioBase: lote.precioBase,
            precioConPromocion: promocionActiva
              ? promocionActiva.precioConDescuento
              : null,
            tienePromocion: !!promocionActiva,
            promocion: promocionActiva
              ? {
                  id: promocionActiva.promocion.id,
                  titulo: promocionActiva.promocion.titulo,
                  descuento: promocionActiva.promocion.descuento,
                }
              : null,
            urbanizacion: lote.urbanizacion,
          };

          if (createCotizacionDto.precioOfertado > precioReferencia) {
            throw new BadRequestException(
              `El precio ofertado no puede ser mayor al precio actual del lote (${precioReferencia})`,
            );
          }
        }

        const cotizacion = await prisma.cotizacion.create({
          data: {
            nombreCliente: createCotizacionDto.nombreCliente,
            contactoCliente: createCotizacionDto.contactoCliente,
            detalle: createCotizacionDto.detalle,
            asesorId: usuarioId,
            inmuebleTipo: createCotizacionDto.inmuebleTipo,
            inmuebleId: createCotizacionDto.inmuebleId,
            precioOfertado: createCotizacionDto.precioOfertado,
            estado: createCotizacionDto.estado || EstadoCotizacion.PENDIENTE,
          },
          include: {
            asesor: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
            lote: {
              include: {
                urbanizacion: {
                  select: {
                    id: true,
                    nombre: true,
                    ubicacion: true,
                    ciudad: true,
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
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (createCotizacionDto.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: createCotizacionDto.inmuebleId },
            data: { estado: 'CON_OFERTA' },
          });
        }

        const datosAuditoria = {
          ...cotizacion,
          loteInfo,
          precioReferencia,
        };

        await this.crearAuditoria(
          usuarioId,
          'CREAR_COTIZACION',
          'Cotizacion',
          cotizacion.id,
          null,
          datosAuditoria,
        );

        return {
          success: true,
          message: 'Cotización creada correctamente',
          data: {
            ...cotizacion,
            loteInfo,
            precioReferencia,
          },
        };
      });
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findAll(nombreCliente?: string, contactoCliente?: string, estado?: string, detalle?: string) {
    try {
      const where: any = {};

      if (nombreCliente) where.nombreCliente = { contains: nombreCliente, mode: 'insensitive' };
      if (contactoCliente) where.contactoCliente = { contains: contactoCliente };
      if (estado) where.estado = estado;
      if (detalle) where.detalle = { contains: detalle, mode: 'insensitive' };

      const cotizaciones = await this.prisma.cotizacion.findMany({
        where,
        include: {
          asesor: {
            select: {
              id: true,
              username: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
          lote: {
            include: {
              urbanizacion: {
                select: {
                  id: true,
                  nombre: true,
                  ubicacion: true,
                  ciudad: true,
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
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const cotizacionesEnriquecidas = cotizaciones.map((cotizacion) => {
        let precioReferencia = 0;
        let tienePromocion = false;
        let promocionInfo: any = null;
        let loteInfo: any = null;

        if (cotizacion.lote) {
          loteInfo = {
            id: cotizacion.lote.id,
            numeroLote: cotizacion.lote.numeroLote,
            superficieM2: Number(cotizacion.lote.superficieM2),
            precioBase: Number(cotizacion.lote.precioBase),
            estado: cotizacion.lote.estado,
            ubicacion: cotizacion.lote.ubicacion,
            ciudad: cotizacion.lote.ciudad,
            urbanizacion: cotizacion.lote.urbanizacion,
          };

          const promocionActiva = cotizacion.lote.LotePromocion[0];
          precioReferencia = promocionActiva
            ? Number(promocionActiva.precioConDescuento)
            : Number(cotizacion.lote.precioBase);
          tienePromocion = !!promocionActiva;
          promocionInfo = promocionActiva
            ? {
                id: promocionActiva.promocion.id,
                titulo: promocionActiva.promocion.titulo,
                descuento: promocionActiva.promocion.descuento,
              }
            : null;
        }

        return {
          ...cotizacion,
          lote: loteInfo,
          precioReferencia,
          tienePromocion,
          promocionInfo,
          diferenciaPrecio:
            precioReferencia - Number(cotizacion.precioOfertado),
          porcentajeDescuento:
            precioReferencia > 0
              ? ((precioReferencia - Number(cotizacion.precioOfertado)) /
                  precioReferencia) *
                100
              : 0,
        };
      });

      return {
        success: true,
        data: { cotizaciones: cotizacionesEnriquecidas },
      };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findOne(id: number) {
    try {
      const cotizacion = await this.prisma.cotizacion.findUnique({
        where: { id },
        include: {
          asesor: {
            select: {
              id: true,
              username: true,
              email: true,
              fullName: true,
              telefono: true,
              role: true,
            },
          },
          lote: {
            include: {
              urbanizacion: {
                select: {
                  id: true,
                  nombre: true,
                  ubicacion: true,
                  ciudad: true,
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
            },
          },
        },
      });

      if (!cotizacion) {
        throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
      }

      let precioReferencia = 0;
      let tienePromocion = false;
      let promocionInfo: any = null;
      let loteInfo: any = null;

      if (cotizacion.lote) {
        loteInfo = {
          id: cotizacion.lote.id,
          numeroLote: cotizacion.lote.numeroLote,
          superficieM2: Number(cotizacion.lote.superficieM2),
          precioBase: Number(cotizacion.lote.precioBase),
          estado: cotizacion.lote.estado,
          ubicacion: cotizacion.lote.ubicacion,
          ciudad: cotizacion.lote.ciudad,
          urbanizacion: cotizacion.lote.urbanizacion,
        };

        const promocionActiva = cotizacion.lote.LotePromocion[0];
        precioReferencia = promocionActiva
          ? Number(promocionActiva.precioConDescuento)
          : Number(cotizacion.lote.precioBase);
        tienePromocion = !!promocionActiva;
        promocionInfo = promocionActiva
          ? {
              id: promocionActiva.promocion.id,
              titulo: promocionActiva.promocion.titulo,
              descuento: promocionActiva.promocion.descuento,
              fechaInicio: promocionActiva.promocion.fechaInicio,
              fechaFin: promocionActiva.promocion.fechaFin,
            }
          : null;
      }

      const cotizacionEnriquecida = {
        ...cotizacion,
        lote: loteInfo,
        precioReferencia,
        tienePromocion,
        promocionInfo,
        diferenciaPrecio: precioReferencia - Number(cotizacion.precioOfertado),
        porcentajeDescuento:
          precioReferencia > 0
            ? ((precioReferencia - Number(cotizacion.precioOfertado)) /
                precioReferencia) *
              100
            : 0,
      };

      return { success: true, data: { cotizacion: cotizacionEnriquecida } };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async update(
    id: number,
    updateCotizacionDto: UpdateCotizacionDto,
    usuarioId: number,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const usuario = await prisma.user.findFirst({
          where: { id: usuarioId, isActive: true },
        });

        if (!usuario) {
          throw new ForbiddenException('Usuario no encontrado o inactivo');
        }

        const cotizacionExistente = await prisma.cotizacion.findUnique({
          where: { id },
          include: {
            lote: {
              include: {
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
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!cotizacionExistente) {
          throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
        }

        const datosAntes = { ...cotizacionExistente };

        if (
          updateCotizacionDto.precioOfertado !== undefined &&
          cotizacionExistente.inmuebleTipo === TipoInmueble.LOTE &&
          cotizacionExistente.lote
        ) {
          const promocionActiva = cotizacionExistente.lote.LotePromocion[0];
          const precioReferencia = promocionActiva
            ? Number(promocionActiva.precioConDescuento)
            : Number(cotizacionExistente.lote.precioBase);

          if (updateCotizacionDto.precioOfertado > precioReferencia) {
            throw new BadRequestException(
              `El precio ofertado no puede ser mayor al precio actual del lote (${precioReferencia})`,
            );
          }
        }

        const cotizacionActualizada = await prisma.cotizacion.update({
          where: { id },
          data: updateCotizacionDto,
          include: {
            asesor: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
            lote: {
              include: {
                urbanizacion: {
                  select: {
                    id: true,
                    nombre: true,
                    ubicacion: true,
                    ciudad: true,
                  },
                },
              },
            },
          },
        });

        await this.crearAuditoria(
          usuarioId,
          'ACTUALIZAR_COTIZACION',
          'Cotizacion',
          id,
          datosAntes,
          cotizacionActualizada,
        );

        return {
          success: true,
          message: 'Cotización actualizada correctamente',
          data: cotizacionActualizada,
        };
      });
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async remove(id: number, usuarioId: number) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const usuario = await prisma.user.findFirst({
          where: { id: usuarioId, isActive: true },
        });

        if (!usuario) {
          throw new ForbiddenException('Usuario no encontrado o inactivo');
        }

        const cotizacion = await prisma.cotizacion.findUnique({
          where: { id },
        });

        if (!cotizacion) {
          throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
        }

        const datosAntes = { ...cotizacion };

        await prisma.cotizacion.delete({ where: { id } });

        if (cotizacion.inmuebleTipo === TipoInmueble.LOTE) {
          const otrasCotizaciones = await prisma.cotizacion.count({
            where: {
              inmuebleId: cotizacion.inmuebleId,
              inmuebleTipo: TipoInmueble.LOTE,
              id: { not: id },
              estado: 'PENDIENTE',
            },
          });

          if (otrasCotizaciones === 0) {
            await prisma.lote.update({
              where: { id: cotizacion.inmuebleId },
              data: { estado: 'DISPONIBLE' },
            });
          }
        }

        await this.crearAuditoria(
          usuarioId,
          'ELIMINAR_COTIZACION',
          'Cotizacion',
          id,
          datosAntes,
          null,
        );

        return { success: true, message: 'Cotización eliminada correctamente' };
      });
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getLotesDisponiblesParaCotizacion(usuarioId: number) {
    try {
      const usuario = await this.prisma.user.findFirst({
        where: { id: usuarioId, isActive: true },
      });

      const lotes = await this.prisma.lote.findMany({
        where: {
          estado: { in: ['DISPONIBLE', 'CON_OFERTA'] },
          encargadoId: usuarioId,
        },
        include: {
          urbanizacion: {
            select: {
              id: true,
              nombre: true,
              ubicacion: true,
              ciudad: true,
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
          _count: {
            select: {
              cotizaciones: {
                where: {
                  estado: 'PENDIENTE',
                },
              },
            },
          },
        },
        orderBy: {
          urbanizacionId: 'asc',
          numeroLote: 'asc',
        },
      });

      const lotesParaCotizacion = lotes.map((lote) => {
        const promocionActiva = lote.LotePromocion[0];
        const precioActual = promocionActiva
          ? promocionActiva.precioConDescuento
          : lote.precioBase;

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

      return {
        success: true,
        data: lotesParaCotizacion,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}