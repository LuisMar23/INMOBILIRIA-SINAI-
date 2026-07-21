// src/propiedad/propiedad.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import {
  CreatePropiedadDto,
  EstadoInmueble,
  TipoPropiedad,
  EstadoPropiedad,
  TipoInmueble,
} from './dto/create-propiedad.dto';
import { UpdatePropiedadDto } from './dto/update-propiedad.dto';

@Injectable()
export class PropiedadService {
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

  async create(createPropiedadDto: CreatePropiedadDto) {
    return this.prisma.$transaction(async (prisma) => {
      const propiedadExistente = await prisma.propiedad.findFirst({
        where: {
          nombre: createPropiedadDto.nombre,
          ciudad: createPropiedadDto.ciudad,
        },
      });

      if (propiedadExistente) {
        throw new BadRequestException(
          'Ya existe una propiedad con este nombre en la misma ciudad',
        );
      }

      const propiedadData = {
        tipo: createPropiedadDto.tipo,
        tipoInmueble: TipoInmueble.PROPIEDAD,
        nombre: createPropiedadDto.nombre,
        tamano: createPropiedadDto.tamano,
        ubicacion: createPropiedadDto.ubicacion,
        encargadoId: createPropiedadDto.encargadoId,
        ciudad: createPropiedadDto.ciudad,
        descripcion: createPropiedadDto.descripcion,
        habitaciones: createPropiedadDto.habitaciones,
        banos: createPropiedadDto.banos,
        precio: createPropiedadDto.precio,
        estado: createPropiedadDto.estado || EstadoInmueble.DISPONIBLE,
        estadoPropiedad:
          createPropiedadDto.estadoPropiedad || EstadoPropiedad.VENTA,
      };

      const propiedad = await prisma.propiedad.create({
        data: propiedadData,
        include: {
          archivos: {
            select: {
              id: true,
              urlArchivo: true,
              tipoArchivo: true,
              nombreArchivo: true,
            },
          },
          ventas: {
            include: {
              cliente: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
              asesor: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
          visitas: {
            include: {
              cliente: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
              asesor: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
      });

      await this.crearAuditoria(
        createPropiedadDto.usuarioId,
        'CREAR',
        'Propiedad',
        propiedad.id,
        null,
        propiedad,
      );

      return {
        success: true,
        message: 'Propiedad creada correctamente',
        data: propiedad,
      };
    });
  }

  async findAll(usuarioId: number) {
    const where: any = {
      OR: [
        { encargadoId: usuarioId },
        { encargadoId: null }
      ]
    };

    const propiedades = await this.prisma.propiedad.findMany({
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
        ventas: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
              },
            },
            asesor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        visitas: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
              },
            },
            asesor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        _count: {
          select: {
            ventas: true,
            visitas: true,
            archivos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: propiedades,
    };
  }

  async findAllPublicas() {
    const propiedades = await this.prisma.propiedad.findMany({
      where: {
        estado: {
          not: EstadoInmueble.VENDIDO
        }
      },
      include: {
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        _count: {
          select: {
            ventas: true,
            visitas: true,
            archivos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: propiedades,
    };
  }

  async findOne(id: number) {
    const propiedad = await this.prisma.propiedad.findUnique({
      where: { id },
      include: {
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        ventas: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            asesor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        visitas: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            asesor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        _count: {
          select: {
            ventas: true,
            visitas: true,
            archivos: true,
          },
        },
      },
    });

    if (!propiedad) {
      throw new NotFoundException(`Propiedad con ID ${id} no encontrada`);
    }

    return {
      success: true,
      data: propiedad,
    };
  }

  async findOneUUID(uuid: string) {
    const propiedad = await this.prisma.propiedad.findUnique({
      where: { uuid },
      include: {
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        ventas: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            asesor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        visitas: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            asesor: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        _count: {
          select: {
            ventas: true,
            visitas: true,
            archivos: true,
          },
        },
      },
    });

    if (!propiedad) {
      throw new NotFoundException(`Propiedad con UUID ${uuid} no encontrada`);
    }

    return {
      success: true,
      data: propiedad,
    };
  }

  async update(id: number, updatePropiedadDto: UpdatePropiedadDto) {
    return this.prisma.$transaction(async (prisma) => {
      const propiedadExistente = await prisma.propiedad.findUnique({
        where: { id },
      });

      if (!propiedadExistente) {
        throw new NotFoundException(`Propiedad con ID ${id} no encontrada`);
      }

      const datosAntes = { ...propiedadExistente };

      if (updatePropiedadDto.nombre || updatePropiedadDto.ciudad) {
        const propiedadConMismoNombre = await prisma.propiedad.findFirst({
          where: {
            nombre: updatePropiedadDto.nombre || propiedadExistente.nombre,
            ciudad: updatePropiedadDto.ciudad || propiedadExistente.ciudad,
            id: { not: id },
          },
        });

        if (propiedadConMismoNombre) {
          throw new BadRequestException(
            'Ya existe una propiedad con este nombre en la misma ciudad',
          );
        }
      }

      const propiedadActualizada = await prisma.propiedad.update({
        where: { id },
        data: {
          tipo: updatePropiedadDto.tipo,
          tipoInmueble: TipoInmueble.PROPIEDAD,
          nombre: updatePropiedadDto.nombre,
          tamano: updatePropiedadDto.tamano,
          ubicacion: updatePropiedadDto.ubicacion,
          ciudad: updatePropiedadDto.ciudad,
          descripcion: updatePropiedadDto.descripcion,
          habitaciones: updatePropiedadDto.habitaciones,
          banos: updatePropiedadDto.banos,
          precio: updatePropiedadDto.precio,
          estado: updatePropiedadDto.estado,
          encargadoId: updatePropiedadDto.encargadoId,
          estadoPropiedad: updatePropiedadDto.estadoPropiedad,
        },
        include: {
          archivos: {
            select: {
              id: true,
              urlArchivo: true,
              tipoArchivo: true,
              nombreArchivo: true,
            },
          },
          ventas: {
            include: {
              cliente: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
          visitas: {
            include: {
              cliente: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
          _count: {
            select: {
              ventas: true,
              visitas: true,
              archivos: true,
            },
          },
        },
      });

      await this.crearAuditoria(
        updatePropiedadDto.usuarioId,
        'ACTUALIZAR',
        'Propiedad',
        id,
        datosAntes,
        propiedadActualizada,
      );

      return {
        success: true,
        message: 'Propiedad actualizada correctamente',
        data: propiedadActualizada,
      };
    });
  }

  async remove(id: number, usuarioId?: number) {
    return this.prisma.$transaction(async (prisma) => {
      const propiedad = await prisma.propiedad.findUnique({
        where: { id },
        include: {
          ventas: true,
          visitas: true,
          archivos: true,
        },
      });

      if (!propiedad) {
        throw new NotFoundException(`Propiedad con ID ${id} no encontrada`);
      }
      const tieneRelaciones =
        propiedad.ventas.length > 0 ||
        propiedad.visitas.length > 0 ||
        propiedad.archivos.length > 0;

      if (tieneRelaciones) {
        throw new BadRequestException(
          'No se puede eliminar la propiedad porque tiene relaciones activas (ventas, visitas o archivos)',
        );
      }

      const datosAntes = { ...propiedad };

      await prisma.propiedad.delete({
        where: { id },
      });

      await this.crearAuditoria(
        usuarioId,
        'ELIMINAR',
        'Propiedad',
        id,
        datosAntes,
        null,
      );

      return {
        success: true,
        message: 'Propiedad eliminada correctamente',
      };
    });
  }

  async getPropiedadesParaCotizacion() {
    const propiedades = await this.prisma.propiedad.findMany({
      where: {
        estado: { in: [EstadoInmueble.DISPONIBLE, EstadoInmueble.CON_OFERTA] },
        estadoPropiedad: EstadoPropiedad.VENTA,
      },
      include: {
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        _count: {
          select: {
            ventas: {
              where: {
                estado: 'PENDIENTE',
              },
            },
          },
        },
      },
      orderBy: {
        tipo: 'asc',
        nombre: 'asc',
      },
    });

    const propiedadesParaCotizacion = propiedades.map((propiedad) => {
      return {
        id: propiedad.id,
        uuid: propiedad.uuid,
        tipo: propiedad.tipo,
        tipoInmueble: propiedad.tipoInmueble,
        nombre: propiedad.nombre,
        tamano: propiedad.tamano,
        ubicacion: propiedad.ubicacion,
        ciudad: propiedad.ciudad,
        precio: propiedad.precio,
        estado: propiedad.estado,
        estadoPropiedad: propiedad.estadoPropiedad,
        descripcion: propiedad.descripcion,
        habitaciones: propiedad.habitaciones,
        banos: propiedad.banos,
        archivos: propiedad.archivos,
        ventasPendientes: propiedad._count.ventas,
      };
    });

    return {
      success: true,
      data: propiedadesParaCotizacion,
    };
  }

  async getPropiedadesPorTipo(tipo: TipoPropiedad) {
    const propiedades = await this.prisma.propiedad.findMany({
      where: {
        tipo,
        estado: {
          not: EstadoInmueble.VENDIDO
        }
      },
      include: {
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        _count: {
          select: {
            ventas: true,
            visitas: true,
            archivos: true,
          },
        },
      },
      orderBy: {
        precio: 'asc',
      },
    });

    return {
      success: true,
      data: propiedades,
    };
  }

  async getPropiedadesPorEstado(estadoPropiedad: EstadoPropiedad) {
    const propiedades = await this.prisma.propiedad.findMany({
      where: {
        estadoPropiedad,
        estado: {
          not: EstadoInmueble.VENDIDO
        }
      },
      include: {
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        _count: {
          select: {
            ventas: true,
            visitas: true,
            archivos: true,
          },
        },
      },
      orderBy: {
        precio: 'asc',
      },
    });

    return {
      success: true,
      data: propiedades,
    };
  }

  async getPropiedadesPorEstadoInmueble(estado: EstadoInmueble) {
    const propiedades = await this.prisma.propiedad.findMany({
      where: {
        estado,
      },
      include: {
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        ventas: {
          include: {
            cliente: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        _count: {
          select: {
            ventas: true,
            visitas: true,
            archivos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: propiedades,
    };
  }

  async asignarEncargado(
    propiedadId: number,
    encargadoId: number,
    usuarioId?: number,
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const propiedad = await prisma.propiedad.findUnique({
        where: { id: propiedadId },
      });

      if (!propiedad) {
        throw new NotFoundException(
          `Propiedad con ID ${propiedadId} no encontrada`,
        );
      }

      if (propiedad.tipo !== 'CASA' && propiedad.tipo !== 'DEPARTAMENTO') {
        throw new BadRequestException(
          'Solo se puede asignar encargado a propiedades de tipo CASA o DEPARTAMENTO',
        );
      }

      const encargado = await prisma.user.findUnique({
        where: {
          id: encargadoId,
          role: { in: ['ASESOR', 'ADMINISTRADOR'] },
        },
      });

      if (!encargado) {
        throw new BadRequestException(
          'Encargado no encontrado o no tiene permisos (solo ASESOR o ADMINISTRADOR)',
        );
      }

      const datosAntes = { ...propiedad };

      const propiedadActualizada = await prisma.propiedad.update({
        where: { id: propiedadId },
        data: {
          encargadoId: encargadoId,
        },
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
          archivos: {
            select: {
              id: true,
              urlArchivo: true,
              tipoArchivo: true,
            },
          },
        },
      });

      await this.crearAuditoria(
        usuarioId,
        'ASIGNAR_ENCARGADO',
        'Propiedad',
        propiedadId,
        datosAntes,
        propiedadActualizada,
      );

      return {
        success: true,
        message: 'Encargado asignado correctamente a la propiedad',
        data: propiedadActualizada,
      };
    });
  }
}