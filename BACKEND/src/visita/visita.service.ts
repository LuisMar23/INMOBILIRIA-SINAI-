import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateVisitaDto,
  EstadoVisita,
  TipoInmueble,
  UpdateVisitaDto,
} from './dto/create-visita.dto';

@Injectable()
export class VisitasService {
  private readonly logger = new Logger(VisitasService.name);

  constructor(private prisma: PrismaService) {}

  private getCurrentTimeLaPaz(): Date {
    const now = new Date();
    const offset = -4 * 60;
    const localTime = new Date(now.getTime() + offset * 60 * 1000);
    return localTime;
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

  private async getLoteInfo(inmuebleId: number) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: inmuebleId },
      include: {
        urbanizacion: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
          },
        },
      },
    });

    if (!lote) return null;

    return {
      id: lote.id,
      numeroLote: lote.numeroLote,
      superficieM2: Number(lote.superficieM2),
      precioBase: Number(lote.precioBase),
      estado: lote.estado,
      urbanizacion: lote.urbanizacion,
    };
  }

  private async getPropiedadInfo(inmuebleId: number) {
    const propiedad = await this.prisma.propiedad.findUnique({
      where: { id: inmuebleId },
      select: {
        id: true,
        uuid: true,
        tipo: true,
        nombre: true,
        tamano: true,
        ubicacion: true,
        ciudad: true,
        descripcion: true,
        habitaciones: true,
        banos: true,
        precio: true,
        estado: true,
        estadoPropiedad: true,
      },
    });

    if (!propiedad) return null;

    return {
      ...propiedad,
      precio: Number(propiedad.precio),
      tamano: Number(propiedad.tamano),
    };
  }

  private async validateInmueble(
    inmuebleTipo: TipoInmueble,
    inmuebleId: number,
    usuarioId?: number,
  ) {
    if (inmuebleTipo === TipoInmueble.LOTE) {
      const lote = await this.prisma.lote.findUnique({
        where: { id: inmuebleId },
      });
      if (!lote) {
        throw new BadRequestException('Lote no encontrado');
      }
      if (lote.estado !== 'DISPONIBLE' && lote.estado !== 'CON_OFERTA') {
        throw new BadRequestException('El lote no está disponible para visita');
      }
      if (usuarioId && lote.encargadoId !== usuarioId) {
        throw new ForbiddenException('No eres el encargado de este lote');
      }
    } else if (inmuebleTipo === TipoInmueble.PROPIEDAD) {
      const propiedad = await this.prisma.propiedad.findUnique({
        where: { id: inmuebleId },
      });
      if (!propiedad) {
        throw new BadRequestException('Propiedad no encontrada');
      }
      if (
        propiedad.estado !== 'DISPONIBLE' &&
        propiedad.estado !== 'CON_OFERTA'
      ) {
        throw new BadRequestException(
          'La propiedad no está disponible para visita',
        );
      }
      if (usuarioId && propiedad.encargadoId !== usuarioId) {
        throw new ForbiddenException('No eres el encargado de esta propiedad');
      }
    } else {
      throw new BadRequestException('Tipo de inmueble no válido');
    }
  }

  async create(createVisitaDto: CreateVisitaDto, usuarioId: number) {
    return this.prisma.$transaction(async (prisma) => {
      try {
        const usuario = await prisma.user.findFirst({
          where: { id: usuarioId, isActive: true },
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        });

        if (!usuario) {
          throw new ForbiddenException('Usuario no encontrado o inactivo');
        }

        const cliente = await prisma.user.findFirst({
          where: {
            id: createVisitaDto.clienteId,
            isActive: true,
            role: 'CLIENTE',
          },
          select: { id: true, isActive: true, role: true },
        });

        if (!cliente) {
          throw new BadRequestException(
            'Cliente no encontrado o no tiene rol de CLIENTE',
          );
        }

        await this.validateInmueble(
          createVisitaDto.inmuebleTipo,
          createVisitaDto.inmuebleId,
          usuarioId,
        );

        const fechaVisita = new Date(createVisitaDto.fechaVisita);
        const ahora = this.getCurrentTimeLaPaz();

        if (fechaVisita < ahora) {
          throw new BadRequestException(
            'La fecha de visita no puede ser en el pasado',
          );
        }

        const visitaExistente = await prisma.visita.findFirst({
          where: {
            clienteId: createVisitaDto.clienteId,
            inmuebleTipo: createVisitaDto.inmuebleTipo,
            fechaVisita: fechaVisita,
            ...(createVisitaDto.inmuebleTipo === TipoInmueble.LOTE 
              ? { loteId: createVisitaDto.inmuebleId } 
              : { propiedadId: createVisitaDto.inmuebleId })
          },
        });

        if (visitaExistente) {
          throw new BadRequestException(
            'Ya existe una visita programada para este inmueble en la misma fecha',
          );
        }

        const data: any = {
          clienteId: createVisitaDto.clienteId,
          asesorId: usuarioId,
          inmuebleTipo: createVisitaDto.inmuebleTipo,
          fechaVisita: fechaVisita,
          estado: createVisitaDto.estado || EstadoVisita.PENDIENTE,
          comentarios: createVisitaDto.comentarios || null,
        };

        if (createVisitaDto.inmuebleTipo === TipoInmueble.LOTE) {
          data.loteId = createVisitaDto.inmuebleId;
        } else {
          data.propiedadId = createVisitaDto.inmuebleId;
        }

        const visita = await prisma.visita.create({
          data,
          select: {
            id: true,
            uuid: true,
            clienteId: true,
            asesorId: true,
            inmuebleTipo: true,
            loteId: true,
            propiedadId: true,
            fechaVisita: true,
            estado: true,
            comentarios: true,
            createdAt: true,
            updatedAt: true,
            cliente: {
              select: {
                id: true,
                fullName: true,
                ci: true,
                telefono: true,
              },
            },
            asesor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        });

        await this.crearAuditoria(
          usuarioId,
          'CREAR_VISITA',
          'Visita',
          visita.id,
          null,
          visita,
        );

        return {
          success: true,
          message: 'Visita creada correctamente',
          data: visita,
        };
      } catch (error) {
        if (
          error instanceof ForbiddenException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        this.logger.error(`Error al crear visita: ${error.message}`);
        throw new InternalServerErrorException('Error al crear la visita');
      }
    });
  }

  async findAll(clienteId?: number, estado?: string, usuarioId?: number) {
    try {
      const where: any = {};

      if (clienteId) where.clienteId = clienteId;
      if (estado) where.estado = estado;
      if (usuarioId) where.asesorId = usuarioId;

      const visitas = await this.prisma.visita.findMany({
        where,
        select: {
          id: true,
          uuid: true,
          clienteId: true,
          asesorId: true,
          inmuebleTipo: true,
          loteId: true,
          propiedadId: true,
          fechaVisita: true,
          estado: true,
          comentarios: true,
          createdAt: true,
          updatedAt: true,
          cliente: {
            select: {
              id: true,
              fullName: true,
              ci: true,
              telefono: true,
            },
          },
          asesor: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { fechaVisita: 'desc' },
      });

      const visitasConInfo = await Promise.all(
        visitas.map(async (visita) => {
          let inmuebleInfo: any = null;

          if (visita.inmuebleTipo === TipoInmueble.LOTE && visita.loteId) {
            inmuebleInfo = await this.getLoteInfo(visita.loteId);
          } else if (visita.inmuebleTipo === TipoInmueble.PROPIEDAD && visita.propiedadId) {
            inmuebleInfo = await this.getPropiedadInfo(visita.propiedadId);
          }

          return {
            ...visita,
            inmueble: inmuebleInfo,
          };
        }),
      );

      return { success: true, data: visitasConInfo };
    } catch (error) {
      this.logger.error(`Error al obtener visitas: ${error.message}`);
      throw new InternalServerErrorException('Error al obtener las visitas');
    }
  }

  async findOne(id: number) {
    try {
      const visita = await this.prisma.visita.findUnique({
        where: { id },
        select: {
          id: true,
          uuid: true,
          clienteId: true,
          asesorId: true,
          inmuebleTipo: true,
          loteId: true,
          propiedadId: true,
          fechaVisita: true,
          estado: true,
          comentarios: true,
          createdAt: true,
          updatedAt: true,
          cliente: {
            select: {
              id: true,
              fullName: true,
              ci: true,
              telefono: true,
              direccion: true,
            },
          },
          asesor: {
            select: {
              id: true,
              fullName: true,
              telefono: true,
            },
          },
        },
      });

      if (!visita) {
        throw new NotFoundException(`Visita con ID ${id} no encontrada`);
      }

      let inmuebleInfo: any = null;
      if (visita.inmuebleTipo === TipoInmueble.LOTE && visita.loteId) {
        inmuebleInfo = await this.getLoteInfo(visita.loteId);
      } else if (visita.inmuebleTipo === TipoInmueble.PROPIEDAD && visita.propiedadId) {
        inmuebleInfo = await this.getPropiedadInfo(visita.propiedadId);
      }

      const visitaConInmueble = {
        ...visita,
        inmueble: inmuebleInfo,
      };

      return { success: true, data: visitaConInmueble };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al obtener visita: ${error.message}`);
      throw new InternalServerErrorException('Error al obtener la visita');
    }
  }

  async update(
    id: number,
    updateVisitaDto: UpdateVisitaDto,
    usuarioId: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      try {
        const usuario = await prisma.user.findFirst({
          where: { id: usuarioId, isActive: true },
          select: { id: true, role: true, isActive: true },
        });

        if (!usuario) {
          throw new ForbiddenException('Usuario no encontrado o inactivo');
        }

        const visitaExistente = await prisma.visita.findUnique({
          where: { id },
        });

        if (!visitaExistente) {
          throw new NotFoundException(`Visita con ID ${id} no encontrada`);
        }

        const datosAntes = { ...visitaExistente };

        if (updateVisitaDto.clienteId) {
          const cliente = await prisma.user.findFirst({
            where: {
              id: updateVisitaDto.clienteId,
              isActive: true,
              role: 'CLIENTE',
            },
            select: { id: true, isActive: true, role: true },
          });
          if (!cliente) {
            throw new BadRequestException(
              'Cliente no encontrado o no tiene rol de CLIENTE',
            );
          }
        }

        if (updateVisitaDto.inmuebleTipo && updateVisitaDto.inmuebleId) {
          await this.validateInmueble(
            updateVisitaDto.inmuebleTipo,
            updateVisitaDto.inmuebleId,
            usuarioId,
          );
        }

        if (updateVisitaDto.fechaVisita) {
          const fechaVisita = new Date(updateVisitaDto.fechaVisita);
          const ahora = this.getCurrentTimeLaPaz();

          if (fechaVisita < ahora) {
            throw new BadRequestException(
              'La fecha de visita no puede ser en el pasado',
            );
          }
        }

        const data: any = { ...updateVisitaDto };
        
        if (updateVisitaDto.inmuebleTipo && updateVisitaDto.inmuebleId) {
          if (updateVisitaDto.inmuebleTipo === TipoInmueble.LOTE) {
            data.loteId = updateVisitaDto.inmuebleId;
            data.propiedadId = null;
          } else {
            data.propiedadId = updateVisitaDto.inmuebleId;
            data.loteId = null;
          }
        }

        const visitaActualizada = await prisma.visita.update({
          where: { id },
          data,
          select: {
            id: true,
            uuid: true,
            clienteId: true,
            asesorId: true,
            inmuebleTipo: true,
            loteId: true,
            propiedadId: true,
            fechaVisita: true,
            estado: true,
            comentarios: true,
            createdAt: true,
            updatedAt: true,
            cliente: {
              select: {
                id: true,
                fullName: true,
                ci: true,
                telefono: true,
              },
            },
            asesor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        });

        await this.crearAuditoria(
          usuarioId,
          'ACTUALIZAR_VISITA',
          'Visita',
          id,
          datosAntes,
          visitaActualizada,
        );

        return {
          success: true,
          message: 'Visita actualizada correctamente',
          data: visitaActualizada,
        };
      } catch (error) {
        if (
          error instanceof ForbiddenException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        this.logger.error(`Error al actualizar visita: ${error.message}`);
        throw new InternalServerErrorException('Error al actualizar la visita');
      }
    });
  }

  async remove(id: number, usuarioId: number) {
    return this.prisma.$transaction(async (prisma) => {
      try {
        const usuario = await prisma.user.findFirst({
          where: { id: usuarioId, isActive: true },
          select: { id: true, role: true, isActive: true },
        });

        if (!usuario) {
          throw new ForbiddenException('Usuario no encontrado o inactivo');
        }

        const visita = await prisma.visita.findUnique({
          where: { id },
        });

        if (!visita) {
          throw new NotFoundException(`Visita con ID ${id} no encontrada`);
        }

        const datosAntes = { ...visita };

        await prisma.visita.delete({ where: { id } });

        await this.crearAuditoria(
          usuarioId,
          'ELIMINAR_VISITA',
          'Visita',
          id,
          datosAntes,
          null,
        );

        return { success: true, message: 'Visita eliminada correctamente' };
      } catch (error) {
        if (
          error instanceof ForbiddenException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
        this.logger.error(`Error al eliminar visita: ${error.message}`);
        throw new InternalServerErrorException('Error al eliminar la visita');
      }
    });
  }

  async getVisitasPorCliente(clienteId: number) {
    try {
      const cliente = await this.prisma.user.findFirst({
        where: { id: clienteId, isActive: true, role: 'CLIENTE' },
        select: {
          id: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
        },
      });

      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const visitas = await this.prisma.visita.findMany({
        where: { clienteId: clienteId },
        select: {
          id: true,
          uuid: true,
          inmuebleTipo: true,
          loteId: true,
          propiedadId: true,
          fechaVisita: true,
          estado: true,
          comentarios: true,
          asesor: {
            select: {
              id: true,
              fullName: true,
              telefono: true,
            },
          },
        },
        orderBy: { fechaVisita: 'desc' },
      });

      const visitasConInfo = await Promise.all(
        visitas.map(async (visita) => {
          let inmuebleInfo: any = null;

          if (visita.inmuebleTipo === TipoInmueble.LOTE && visita.loteId) {
            inmuebleInfo = await this.getLoteInfo(visita.loteId);
          } else if (visita.inmuebleTipo === TipoInmueble.PROPIEDAD && visita.propiedadId) {
            inmuebleInfo = await this.getPropiedadInfo(visita.propiedadId);
          }

          return {
            ...visita,
            inmueble: inmuebleInfo,
          };
        }),
      );

      return {
        success: true,
        data: { cliente, visitas: visitasConInfo },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener visitas por cliente: ${error.message}`,
      );
      throw new InternalServerErrorException('Error al obtener las visitas');
    }
  }

  async getVisitasPorAsesor(asesorId: number) {
    try {
      const asesor = await this.prisma.user.findFirst({
        where: { id: asesorId, isActive: true },
        select: {
          id: true,
          fullName: true,
          telefono: true,
          email: true,
        },
      });

      if (!asesor) {
        throw new NotFoundException('Asesor no encontrado');
      }

      const visitas = await this.prisma.visita.findMany({
        where: { asesorId: asesorId },
        select: {
          id: true,
          uuid: true,
          inmuebleTipo: true,
          loteId: true,
          propiedadId: true,
          fechaVisita: true,
          estado: true,
          comentarios: true,
          cliente: {
            select: {
              id: true,
              fullName: true,
              ci: true,
              telefono: true,
            },
          },
        },
        orderBy: { fechaVisita: 'desc' },
      });

      const visitasConInfo = await Promise.all(
        visitas.map(async (visita) => {
          let inmuebleInfo: any = null;

          if (visita.inmuebleTipo === TipoInmueble.LOTE && visita.loteId) {
            inmuebleInfo = await this.getLoteInfo(visita.loteId);
          } else if (visita.inmuebleTipo === TipoInmueble.PROPIEDAD && visita.propiedadId) {
            inmuebleInfo = await this.getPropiedadInfo(visita.propiedadId);
          }

          return {
            ...visita,
            inmueble: inmuebleInfo,
          };
        }),
      );

      return {
        success: true,
        data: { asesor, visitas: visitasConInfo },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener visitas por asesor: ${error.message}`,
      );
      throw new InternalServerErrorException('Error al obtener las visitas');
    }
  }
}