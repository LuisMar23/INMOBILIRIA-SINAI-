import { Injectable } from '@nestjs/common';
import { EstadoInmueble, Prisma } from '../../generated/prisma';
import { PrismaService } from 'src/config/prisma.service';
import {
  LoteReporteDto,
  ReporteLotesResponseDto,
  ReporteLotesDetalleResponseDto,
  LoteDetalleDto,
  ManzanoDto,
} from './dto/create-reporteslote.dto';

@Injectable()
export class ReportesLotesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Manzanos disponibles por urbanización ────────────────────────────────
  async getManzanos(urbanizacionId?: number): Promise<ManzanoDto[]> {
    const manzanos = await this.prisma.manzano.findMany({
      where: {
        ...(urbanizacionId ? { urbanizacionId } : {}),
      },
      select: { id: true, uuid: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return manzanos;
  }

  // ─── Builder de where reutilizable ───────────────────────────────────────
  private buildWhere(
    urbanizacionId?: number,
    manzanoId?: number,
    estado?: EstadoInmueble,
  ): Prisma.LoteWhereInput {
    return {
      ...(urbanizacionId ? { urbanizacionId } : {}),
      ...(manzanoId ? { manzanoId } : {}),
      ...(estado ? { estado } : {}),
    };
  }

  // ─── Select base reutilizable ─────────────────────────────────────────────
  private get selectBase() {
    return {
      id: true,
      uuid: true,
      numeroLote: true,
      superficieM2: true,
      precioBase: true,
      ubicacion: true,
      ciudad: true,
      estado: true,
      esIndependiente: true,
      manzano: {
        select: { id: true, uuid: true, nombre: true },
      },
      urbanizacion: {
        select: { id: true, nombre: true, ubicacion: true },
      },
    };
  }

  private mapLote(l: any): LoteReporteDto {
    return {
      id: l.id,
      uuid: l.uuid,
      numeroLote: l.numeroLote,
      manzano: l.manzano ?? null,
      superficieM2: Number(l.superficieM2),
      precioBase: Number(l.precioBase),
      ubicacion: l.ubicacion,
      ciudad: l.ciudad,
      estado: l.estado,
      esIndependiente: l.esIndependiente,
      urbanizacion: l.urbanizacion ?? null,
    };
  }

  // ─── Total de lotes ───────────────────────────────────────────────────────
  async getTotalLotes(
    urbanizacionId?: number,
    manzanoId?: number,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzanoId);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: { nombre: 'asc' } }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });

    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }

  // ─── Lotes disponibles ────────────────────────────────────────────────────
  async getLotesDisponibles(
    urbanizacionId?: number,
    manzanoId?: number,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzanoId, EstadoInmueble.DISPONIBLE);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: { nombre: 'asc' } }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });

    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }

  // ─── Lotes vendidos ───────────────────────────────────────────────────────
  async getLotesVendidos(
    urbanizacionId?: number,
    manzanoId?: number,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzanoId, EstadoInmueble.VENDIDO);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: { nombre: 'asc' } }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });

    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }

  // ─── Lotes reservados ─────────────────────────────────────────────────────
  async getLotesReservados(
    urbanizacionId?: number,
    manzanoId?: number,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzanoId, EstadoInmueble.RESERVADO);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: { nombre: 'asc' } }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });

    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }

  // ─── Detalle de lotes ─────────────────────────────────────────────────────
  async getDetalleLotes(
    urbanizacionId?: number,
    manzanoId?: number,
  ): Promise<ReporteLotesDetalleResponseDto> {
    const where = this.buildWhere(urbanizacionId, manzanoId);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: { nombre: 'asc' } }, { numeroLote: 'asc' }],
      select: {
        ...this.selectBase,
        encargado: { select: { fullName: true } },
        _count: {
          select: { ventas: true, reservas: true, cotizaciones: true },
        },
      },
    });

    const data: LoteDetalleDto[] = lotes.map((l) => ({
      ...this.mapLote(l),
      totalVentas: l._count.ventas,
      totalReservas: l._count.reservas,
      totalCotizaciones: l._count.cotizaciones,
      encargado: l.encargado?.fullName ?? null,
    }));

    return {
      data,
      totalLotes: data.length,
      totalSuperficieM2: data.reduce((s, l) => s + l.superficieM2, 0),
      totalPrecioBase: data.reduce((s, l) => s + l.precioBase, 0),
      generadoEn: new Date(),
    };
  }

  // ─── Reporte general detallado ────────────────────────────────────────────
  async getGeneralDetallado(urbanizacionId?: number) {
    const [disponibles, vendidos, reservados, conOferta] = await Promise.all([
      this.getLotesDisponibles(urbanizacionId),
      this.getLotesVendidos(urbanizacionId),
      this.getLotesReservados(urbanizacionId),
      this.getTotalLotesPorEstado(urbanizacionId, EstadoInmueble.CON_OFERTA),
    ]);

    const todos = [
      ...disponibles.data,
      ...vendidos.data,
      ...reservados.data,
      ...conOferta.data,
    ];

    return {
      disponibles,
      vendidos,
      reservados,
      conOferta,
      resumen: {
        totalDisponibles: disponibles.totalLotes,
        totalVendidos: vendidos.totalLotes,
        totalReservados: reservados.totalLotes,
        totalConOferta: conOferta.totalLotes,
        totalLotes: todos.length,
        totalSuperficieM2: todos.reduce((s, l) => s + l.superficieM2, 0),
        totalPrecioBase: todos.reduce((s, l) => s + l.precioBase, 0),
      },
      generadoEn: new Date(),
    };
  }

  private async getTotalLotesPorEstado(
    urbanizacionId?: number,
    estado?: EstadoInmueble,
  ): Promise<ReporteLotesResponseDto> {
    const where = this.buildWhere(urbanizacionId, undefined, estado);
    const lotes = await this.prisma.lote.findMany({
      where,
      orderBy: [{ manzano: { nombre: 'asc' } }, { numeroLote: 'asc' }],
      select: this.selectBase,
    });
    return {
      data: lotes.map(this.mapLote.bind(this)),
      totalLotes: lotes.length,
      generadoEn: new Date(),
    };
  }
}