import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateCajaDto, AbrirCajaDto } from './dto/create-caja.dto';

@Injectable()
export class CajaService {
  constructor(private prisma: PrismaService) {}

  async create(createCajaDto: CreateCajaDto) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: createCajaDto.usuarioAperturaId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!['ADMINISTRADOR', 'SECRETARIA'].includes(usuario.role)) {
      throw new ForbiddenException(
        'Solo administradores y secretarias pueden crear cajas',
      );
    }

    return this.prisma.caja.create({
      data: {
        nombre: createCajaDto.nombre,
        montoInicial: createCajaDto.montoInicial,
        saldoActual: createCajaDto.montoInicial,
        estado: 'ABIERTA', // Cambiado de 'CERRADA' a 'ABIERTA'
        usuarioAperturaId: createCajaDto.usuarioAperturaId,
      },
      include: {
        usuarioApertura: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.caja.findMany({
      include: {
        usuarioApertura: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: {
        creadoEn: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const caja = await this.prisma.caja.findUnique({
      where: { id },
      include: {
        usuarioApertura: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
        movimientos: {
          orderBy: { fecha: 'desc' },
          take: 10,
          include: {
            usuario: {
              select: {
                id: true,
                fullName: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }

    return caja;
  }

  async abrir(
    cajaId: number,
    usuarioId: number,
    montoInicial: number,
    ip?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.user.findUnique({ where: { id: usuarioId } });
      if (!usuario || !['ADMINISTRADOR', 'SECRETARIA'].includes(usuario.role)) {
        throw new ForbiddenException(
          'Solo administradores y secretarias pueden abrir cajas',
        );
      }

      const caja = await tx.caja.findUnique({ where: { id: cajaId } });
      if (!caja) throw new NotFoundException('Caja no encontrada');
      if (caja.estado === 'ABIERTA')
        throw new BadRequestException('La caja ya está abierta');

      const cajaActualizada = await tx.caja.update({
        where: { id: cajaId },
        data: {
          estado: 'ABIERTA',
          montoInicial: montoInicial,
          saldoActual: montoInicial,
          usuarioAperturaId: usuarioId,
        },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: usuarioId,
          accion: 'APERTURA_CAJA',
          tablaAfectada: 'Caja',
          registroId: cajaId,
          datosDespues: JSON.stringify(cajaActualizada),
          ip: ip,
          dispositivo: userAgent,
        },
      });

      return cajaActualizada;
    });
  }

  async cerrar(
    cajaId: number,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.user.findUnique({ where: { id: usuarioId } });
      if (!usuario || !['ADMINISTRADOR', 'SECRETARIA'].includes(usuario.role)) {
        throw new ForbiddenException(
          'Solo administradores y secretarias pueden cerrar cajas',
        );
      }

      const caja = await tx.caja.findUnique({ where: { id: cajaId } });
      if (!caja) throw new NotFoundException('Caja no encontrada');
      if (caja.estado === 'CERRADA')
        throw new BadRequestException('La caja ya está cerrada');

      const cajaActualizada = await tx.caja.update({
        where: { id: cajaId },
        data: { estado: 'CERRADA' },
      });

      await tx.auditoria.create({
        data: {
          usuarioId: usuarioId,
          accion: 'CIERRE_CAJA',
          tablaAfectada: 'Caja',
          registroId: cajaId,
          datosDespues: JSON.stringify(cajaActualizada),
          ip: ip,
          dispositivo: userAgent,
        },
      });

      return cajaActualizada;
    });
  }
}