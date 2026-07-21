// src/reserva/reserva.service.ts (corregido)
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateReservaDto,
  TipoInmueble,
  EstadoReserva,
} from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

@Injectable()
export class ReservasService {
  constructor(private prisma: PrismaService) {}

  private getCurrentTimeLaPaz(): Date {
    const now = new Date();
    const offset = -4 * 60;
    return new Date(now.getTime() + offset * 60 * 1000);
  }

  private calcularFechaVencimiento(fechaInicio: Date): Date {
    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setHours(fechaVencimiento.getHours() + 24);
    return fechaVencimiento;
  }

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
          usuarioId,
          accion,
          tablaAfectada,
          registroId,
          datosAntes: datosAntes ? JSON.stringify(datosAntes) : null,
          datosDespues: datosDespues ? JSON.stringify(datosDespues) : null,
          ip: '127.0.0.1',
          dispositivo: 'API',
          createdAt: this.getCurrentTimeLaPaz(),
        },
      });
    } catch (error) {
      console.error('Error creando auditoría:', error);
    }
  }

  private async verificarYActualizarReservasVencidas() {
    const ahora = this.getCurrentTimeLaPaz();

    const reservasVencidas = await this.prisma.reserva.findMany({
      where: {
        estado: EstadoReserva.ACTIVA,
        fechaVencimiento: {
          lt: ahora,
        },
      },
    });

    for (const reserva of reservasVencidas) {
      await this.prisma.$transaction(async (prisma) => {
        await prisma.reserva.update({
          where: { id: reserva.id },
          data: { estado: EstadoReserva.VENCIDA },
        });

        if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: reserva.inmuebleId },
            data: { estado: 'DISPONIBLE' },
          });
        }
      });
    }

    return reservasVencidas.length;
  }

  async getLotesDisponiblesParaReserva(usuarioId: number, usuarioRole: string) {
    try {
      const whereClause: any = {
        estado: 'DISPONIBLE',
      };

      if (usuarioRole === 'ASESOR' || usuarioRole === 'ADMINISTRADOR') {
        whereClause.encargadoId = usuarioId;
      }

      const lotes = await this.prisma.lote.findMany({
        where: whereClause,
        include: {
          urbanizacion: {
            select: {
              id: true,
              nombre: true,
              ubicacion: true,
              ciudad: true,
            },
          },
          encargado: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          manzano: true,
        },
        orderBy: [{ urbanizacionId: 'asc' }, { numeroLote: 'asc' }],
      });

      return {
        success: true,
        data: lotes,
      };
    } catch (error) {
      console.error('Error en getLotesDisponiblesParaReserva:', error);
      throw new InternalServerErrorException(
        'Error al obtener lotes disponibles',
      );
    }
  }

  async create(createReservaDto: CreateReservaDto, asesorId: number) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const asesor = await prisma.user.findFirst({
          where: {
            id: asesorId,
            isActive: true,
            role: { in: ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'] },
          },
        });

        if (!asesor) {
          throw new ForbiddenException(
            'No tienes permisos para crear reservas',
          );
        }

        const cliente = await prisma.user.findFirst({
          where: {
            id: createReservaDto.clienteId,
            isActive: true,
            role: 'CLIENTE',
          },
        });

        if (!cliente) {
          throw new BadRequestException(
            'Cliente no encontrado o no tiene rol de CLIENTE',
          );
        }

        if (createReservaDto.inmuebleTipo === TipoInmueble.LOTE) {
          const whereClause: any = {
            id: createReservaDto.inmuebleId,
            estado: 'DISPONIBLE',
          };

          if (asesor.role === 'ASESOR') {
            whereClause.encargadoId = asesorId;
          }

          const lote = await prisma.lote.findFirst({
            where: whereClause,
          });

          if (!lote) {
            throw new BadRequestException(
              `El lote con ID ${createReservaDto.inmuebleId} no existe, no está disponible o no eres el encargado`,
            );
          }
        }

        const fechaInicio = new Date(createReservaDto.fechaInicio);
        const fechaVencimiento = this.calcularFechaVencimiento(fechaInicio);

        const reserva = await prisma.reserva.create({
          data: {
            clienteId: createReservaDto.clienteId,
            asesorId,
            inmuebleTipo: createReservaDto.inmuebleTipo,
            inmuebleId: createReservaDto.inmuebleId,
            fechaInicio: fechaInicio,
            fechaVencimiento: fechaVencimiento,
            estado: createReservaDto.estado || EstadoReserva.ACTIVA,
          },
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                ci: true,
                telefono: true,
                direccion: true,
                role: true,
              },
            },
            asesor: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
          },
        });

        if (createReservaDto.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: createReservaDto.inmuebleId },
            data: { estado: 'RESERVADO' },
          });
        }

        await this.crearAuditoria(
          asesorId,
          'CREAR_RESERVA',
          'Reserva',
          reserva.id,
          null,
          {
            clienteId: reserva.clienteId,
            asesorId: reserva.asesorId,
            inmuebleTipo: reserva.inmuebleTipo,
            inmuebleId: reserva.inmuebleId,
            fechaInicio: reserva.fechaInicio,
            fechaVencimiento: reserva.fechaVencimiento,
            estado: reserva.estado,
          },
        );

        return {
          success: true,
          message:
            'Reserva creada correctamente. La reserva expirará en 24 horas.',
          data: reserva,
        };
      });
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findAll(clienteId?: number, estado?: string) {
    try {
      await this.verificarYActualizarReservasVencidas();

      const where: any = {};
      if (clienteId) where.clienteId = clienteId;
      if (estado) where.estado = estado;

      const reservas = await this.prisma.reserva.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              fullName: true,
              ci: true,
              telefono: true,
              direccion: true,
              role: true,
            },
          },
          asesor: {
            select: {
              id: true,
              username: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const reservasConLotes = await Promise.all(
        reservas.map(async (reserva) => {
          let loteInfo: any = null;

          if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
            const lote = await this.prisma.lote.findUnique({
              where: { id: reserva.inmuebleId },
              include: {
                urbanizacion: {
                  select: { id: true, nombre: true, ubicacion: true },
                },
                encargado: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                  },
                },
                manzano: true,
              },
            });

            if (lote) {
              loteInfo = {
                id: lote.id,
                numeroLote: lote.numeroLote,
                superficieM2: Number(lote.superficieM2),
                precioBase: Number(lote.precioBase),
                estado: lote.estado,
                manzano: lote.manzano,
                urbanizacion: lote.urbanizacion,
                encargado: lote.encargado,
              };
            }
          }

          return { ...reserva, lote: loteInfo };
        }),
      );

      return { success: true, data: reservasConLotes };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findOne(id: number) {
    try {
      await this.verificarYActualizarReservasVencidas();

      const reserva = await this.prisma.reserva.findUnique({
        where: { id },
        include: {
          cliente: {
            select: {
              id: true,
              fullName: true,
              ci: true,
              telefono: true,
              direccion: true,
              observaciones: true,
              role: true,
            },
          },
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
        },
      });

      if (!reserva) {
        throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
      }

      let loteInfo: any = null;
      if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
        const lote = await this.prisma.lote.findUnique({
          where: { id: reserva.inmuebleId },
          include: {
            urbanizacion: {
              select: { id: true, nombre: true, ubicacion: true },
            },
            encargado: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
            manzano: true,
          },
        });

        if (lote) {
          loteInfo = {
            id: lote.id,
            numeroLote: lote.numeroLote,
            superficieM2: Number(lote.superficieM2),
            precioBase: Number(lote.precioBase),
            estado: lote.estado,
            manzano: lote.manzano,
            urbanizacion: lote.urbanizacion,
            encargado: lote.encargado,
          };
        }
      }

      return { success: true, data: { ...reserva, lote: loteInfo } };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async update(
    id: number,
    updateReservaDto: UpdateReservaDto,
    usuarioId: number,
  ) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const usuario = await prisma.user.findFirst({
          where: {
            id: usuarioId,
            isActive: true,
            role: { in: ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'] },
          },
        });

        if (!usuario) {
          throw new ForbiddenException(
            'No tienes permisos para actualizar reservas',
          );
        }

        const reservaExistente = await prisma.reserva.findUnique({
          where: { id },
        });

        if (!reservaExistente) {
          throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
        }

        const datosAntes = { ...reservaExistente };
        const dataActualizada: any = {};

        if (
          updateReservaDto.clienteId !== undefined &&
          updateReservaDto.clienteId !== reservaExistente.clienteId
        ) {
          const cliente = await prisma.user.findFirst({
            where: {
              id: updateReservaDto.clienteId,
              isActive: true,
              role: 'CLIENTE',
            },
          });
          if (!cliente) {
            throw new BadRequestException(
              'Cliente no encontrado o no tiene rol de CLIENTE',
            );
          }
          dataActualizada.clienteId = updateReservaDto.clienteId;
        }

        if (
          updateReservaDto.estado !== undefined &&
          updateReservaDto.estado !== reservaExistente.estado
        ) {
          dataActualizada.estado = updateReservaDto.estado;
        }

        if (
          updateReservaDto.inmuebleTipo !== undefined &&
          updateReservaDto.inmuebleTipo !== reservaExistente.inmuebleTipo
        ) {
          dataActualizada.inmuebleTipo = updateReservaDto.inmuebleTipo;
        }

        if (
          updateReservaDto.inmuebleId !== undefined &&
          updateReservaDto.inmuebleId !== reservaExistente.inmuebleId
        ) {
          if (updateReservaDto.inmuebleTipo === TipoInmueble.LOTE) {
            const whereClause: any = {
              id: updateReservaDto.inmuebleId,
              estado: 'DISPONIBLE',
            };

            if (usuario.role === 'ASESOR') {
              whereClause.encargadoId = usuarioId;
            }

            const lote = await prisma.lote.findFirst({
              where: whereClause,
            });

            if (!lote) {
              throw new BadRequestException(
                `El lote con ID ${updateReservaDto.inmuebleId} no existe, no está disponible o no eres el encargado`,
              );
            }
          }
          dataActualizada.inmuebleId = updateReservaDto.inmuebleId;
        }

        if (updateReservaDto.fechaInicio !== undefined) {
          const fechaInicio = new Date(updateReservaDto.fechaInicio);
          dataActualizada.fechaInicio = fechaInicio;
          dataActualizada.fechaVencimiento =
            this.calcularFechaVencimiento(fechaInicio);
        }

        if (Object.keys(dataActualizada).length === 0) {
          return {
            success: true,
            message: 'No hay cambios para actualizar',
            data: reservaExistente,
          };
        }

        const reservaActualizada = await prisma.reserva.update({
          where: { id },
          data: dataActualizada,
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                ci: true,
                telefono: true,
                role: true,
              },
            },
            asesor: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
          },
        });

        await this.crearAuditoria(
          usuarioId,
          'ACTUALIZAR_RESERVA',
          'Reserva',
          id,
          datosAntes,
          reservaActualizada,
        );

        return {
          success: true,
          message: 'Reserva actualizada correctamente',
          data: reservaActualizada,
        };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
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
          where: {
            id: usuarioId,
            isActive: true,
            role: { in: ['ASESOR', 'ADMINISTRADOR', 'SECRETARIA'] },
          },
        });

        if (!usuario) {
          throw new ForbiddenException(
            'No tienes permisos para eliminar reservas',
          );
        }

        const reserva = await prisma.reserva.findUnique({
          where: { id },
        });

        if (!reserva) {
          throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
        }

        const datosAntes = { ...reserva };

        await prisma.reserva.delete({ where: { id } });

        if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: reserva.inmuebleId },
            data: { estado: 'DISPONIBLE' },
          });
        }

        await this.crearAuditoria(
          usuarioId,
          'ELIMINAR_RESERVA',
          'Reserva',
          id,
          datosAntes,
          null,
        );

        return { success: true, message: 'Reserva eliminada correctamente' };
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getReservasPorCliente(clienteId: number) {
    try {
      await this.verificarYActualizarReservasVencidas();

      const cliente = await this.prisma.user.findFirst({
        where: { id: clienteId, isActive: true, role: 'CLIENTE' },
      });

      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const reservas = await this.prisma.reserva.findMany({
        where: { clienteId },
        include: {
          asesor: {
            select: { id: true, fullName: true, telefono: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const reservasConLotes = await Promise.all(
        reservas.map(async (reserva) => {
          let loteInfo: any = null;

          if (reserva.inmuebleTipo === TipoInmueble.LOTE) {
            const lote = await this.prisma.lote.findUnique({
              where: { id: reserva.inmuebleId },
              include: {
                urbanizacion: {
                  select: { id: true, nombre: true, ubicacion: true },
                },
                encargado: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                  },
                },
                manzano: true,
              },
            });

            if (lote) {
              loteInfo = {
                id: lote.id,
                numeroLote: lote.numeroLote,
                superficieM2: Number(lote.superficieM2),
                precioBase: Number(lote.precioBase),
                estado: lote.estado,
                manzano: lote.manzano,
                urbanizacion: lote.urbanizacion,
                encargado: lote.encargado,
              };
            }
          }

          return { ...reserva, lote: loteInfo };
        }),
      );

      return { success: true, data: { cliente, reservas: reservasConLotes } };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}
