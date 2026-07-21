import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateCierreDto } from './dto/create-cierre.dto';

@Injectable()
export class CierreService {
  constructor(private prisma: PrismaService) {}

  async create(payload: CreateCierreDto & { ip?: string; userAgent?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.user.findUnique({
        where: { id: payload.usuarioId },
      });
      if (!usuario || !['ADMINISTRADOR', 'SECRETARIA'].includes(usuario.role)) {
        throw new ForbiddenException(
          'Solo administradores y secretarias pueden realizar cierres de caja',
        );
      }

      const caja = await tx.caja.findUnique({ where: { id: payload.cajaId } });
      if (!caja) throw new NotFoundException('Caja no encontrada');

      // Validar que la caja esté abierta para poder cerrarla
      if (caja.estado !== 'ABIERTA') {
        throw new BadRequestException(
          'La caja debe estar abierta para realizar un cierre',
        );
      }

      const saldoFinal = Number(caja.saldoActual);
      const diferencia = Number(payload.saldoReal) - saldoFinal;

      const cierre = await tx.cierreCaja.create({
        data: {
          cajaId: payload.cajaId,
          usuarioId: payload.usuarioId,
          tipo: payload.tipo ?? 'TOTAL',
          saldoInicial: Number(caja.montoInicial ?? 0),
          saldoFinal: saldoFinal,
          saldoReal: Number(payload.saldoReal),
          diferencia: diferencia,
          observaciones: payload.observaciones,
        },
        include: {
          usuario: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
            },
          },
          caja: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      // Solo cerrar la caja si es un cierre TOTAL
      if ((payload.tipo ?? 'TOTAL') === 'TOTAL') {
        await tx.caja.update({
          where: { id: payload.cajaId },
          data: { estado: 'CERRADA' },
        });
      }

      await tx.auditoria.create({
        data: {
          usuarioId: payload.usuarioId,
          accion:
            (payload.tipo ?? 'TOTAL') === 'TOTAL'
              ? 'CIERRE_TOTAL'
              : 'CIERRE_PARCIAL',
          tablaAfectada: 'CierreCaja',
          registroId: cierre.id,
          datosDespues: JSON.stringify(cierre),
          ip: payload.ip,
          dispositivo: payload.userAgent,
        },
      });

      return cierre;
    });
  }

  async findByCaja(cajaId: number) {
    return this.prisma.cierreCaja.findMany({
      where: { cajaId },
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
      orderBy: { fechaCierre: 'desc' },
    });
  }

  async getUltimoCierre(cajaId: number) {
    return this.prisma.cierreCaja.findFirst({
      where: { cajaId },
      orderBy: { fechaCierre: 'desc' },
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
    });
  }
}