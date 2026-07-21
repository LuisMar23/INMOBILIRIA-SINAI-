import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { ReporteClientesResponseDto, ReporteClientesPotencialesResponseDto } from './dto/create-reportes-clientes-service.dto';


@Injectable()
export class ReportesClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async getListaClientes(): Promise<ReporteClientesResponseDto> {
    const clientes = await this.prisma.user.findMany({
      where: {
        role: 'CLIENTE',
        estado: true,
      },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        uuid: true,
        fullName: true,
        ci: true,
        email: true,
        telefono: true,
        direccion: true,
        observaciones: true,
        isActive: true,
        createdAt: true,
        ventasComoCliente: {
          select: { precioFinal: true },
        },
        _count: {
          select: {
            ventasComoCliente: true,
            reservasComoCliente: true,
            visitasComoCliente: true,
          },
        },
      },
    });

    const data = clientes.map((c) => ({
      id: c.id,
      uuid: c.uuid,
      fullName: c.fullName,
      ci: c.ci,
      email: c.email,
      telefono: c.telefono,
      direccion: c.direccion,
      observaciones: c.observaciones,
      isActive: c.isActive,
      createdAt: c.createdAt,
      totalVentas: c._count.ventasComoCliente,
      totalReservas: c._count.reservasComoCliente,
      totalVisitas: c._count.visitasComoCliente,
      montoTotal: c.ventasComoCliente.reduce(
        (sum, v) => sum + Number(v.precioFinal),
        0,
      ),
    }));

    return {
      data,
      totalClientes: data.length,
      generadoEn: new Date(),
    };
  }

  async getClientesPotenciales(): Promise<ReporteClientesPotencialesResponseDto> {
    const LIMITE = 300;

    const clientes = await this.prisma.user.findMany({
      where: {
        role: 'CLIENTE',
        estado: true,
        ventasComoCliente: { some: {} },
      },
      select: {
        id: true,
        uuid: true,
        fullName: true,
        ci: true,
        email: true,
        telefono: true,
        direccion: true,
        observaciones: true,
        isActive: true,
        createdAt: true,
        ventasComoCliente: {
          select: { precioFinal: true },
        },
        _count: {
          select: {
            ventasComoCliente: true,
            reservasComoCliente: true,
            visitasComoCliente: true,
          },
        },
      },
    });

    const clientesConMonto = clientes
      .map((c) => ({
        id: c.id,
        uuid: c.uuid,
        fullName: c.fullName,
        ci: c.ci,
        email: c.email,
        telefono: c.telefono,
        direccion: c.direccion,
        observaciones: c.observaciones,
        isActive: c.isActive,
        createdAt: c.createdAt,
        totalVentas: c._count.ventasComoCliente,
        totalReservas: c._count.reservasComoCliente,
        totalVisitas: c._count.visitasComoCliente,
        montoTotal: c.ventasComoCliente.reduce(
          (sum, v) => sum + Number(v.precioFinal),
          0,
        ),
      }))
      .sort((a, b) => b.montoTotal - a.montoTotal);

    const totalGeneralBs = clientesConMonto.reduce(
      (sum, c) => sum + c.montoTotal,
      0,
    );

    const data = clientesConMonto.slice(0, LIMITE);

    return {
      data,
      totalMostrados: data.length,
      totalGeneralBs,
      nota: `Este reporte muestra un máximo de ${LIMITE} clientes potenciales, ordenados por el monto total de sus compras. Se incluyen únicamente clientes que han realizado múltiples compras o compras por montos significativos, representando las mejores oportunidades comerciales de la empresa.`,
      generadoEn: new Date(),
    };
  }
}