// src/reportes/reportes-ventas.service.ts (corregido)
import { Injectable } from '@nestjs/common';
import { Prisma, TipoInmueble, EstadoVenta } from 'generated/prisma';
import { PrismaService } from 'src/config/prisma.service';
import { FiltrosReporteDto, FiltrosClienteDto } from './dto/create-reporte.dto';

@Injectable()
export class ReportesVentasService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhereVenta(filtros: FiltrosReporteDto): Prisma.VentaWhereInput {
    const where: Prisma.VentaWhereInput = {};

    if (filtros.fechaInicio || filtros.fechaFin) {
      where.createdAt = {
        ...(filtros.fechaInicio && { gte: new Date(filtros.fechaInicio) }),
        ...(filtros.fechaFin && {
          lte: new Date(new Date(filtros.fechaFin).setHours(23, 59, 59, 999)),
        }),
      };
    }

    if (filtros.tipoVenta && filtros.tipoVenta !== 'TODOS') {
      where.inmuebleTipo = filtros.tipoVenta as TipoInmueble;
    }

    if (filtros.asesorId) {
      where.asesorId = Number(filtros.asesorId);
    }

    // ✅ ahora filtra por manzanoId numérico (FK directa), no por nombre string
    if (filtros.manzanoId) {
      where.lote = {
        ...((where.lote as object) ?? {}),
        manzanoId: Number(filtros.manzanoId),
      };
    }

    if (filtros.ciudad) {
      where.OR = [
        { lote: { ciudad: filtros.ciudad } },
        { propiedad: { ciudad: filtros.ciudad } },
      ];
    }

    // ✅ filtro de urbanización, salvo que se pida alcance global explícito
    const esGlobal =
      filtros.global === true || (filtros.global as any) === 'true';
    if (!esGlobal && filtros.urbanizacionId) {
      where.OR = [
        { lote: { urbanizacionId: Number(filtros.urbanizacionId) } },
        { propiedad: { urbanizacionId: Number(filtros.urbanizacionId) } },
      ];
    }

    return where;
  }

  private get includeVentaBase() {
    return {
      cliente: {
        select: {
          id: true,
          fullName: true,
          ci: true,
          telefono: true,
          email: true,
        },
      },
      asesor: {
        select: { id: true, fullName: true, telefono: true },
      },
      lote: {
        select: {
          id: true,
          numeroLote: true,
          manzano: { select: { id: true, nombre: true } }, // 👈 fix: relación con select
          superficieM2: true,
          precioBase: true,
          ciudad: true,
          urbanizacion: { select: { id: true, nombre: true } },
        },
      },
      propiedad: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
          ciudad: true,
          ubicacion: true,
        },
      },
    } satisfies Prisma.VentaInclude;
  }

  async getReporteVentas(filtros: FiltrosReporteDto) {
    const where = this.buildWhereVenta(filtros);

    const ventas = await this.prisma.venta.findMany({
      where,
      include: {
        ...this.includeVentaBase,
        planPago: {
          select: {
            id_plan_pago: true,
            total: true,
            montoInicial: true,
            estado: true,
            fechaVencimiento: true, // 👈 fix
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const resumen = {
      totalVentas: ventas.length,
      montoTotal: ventas.reduce((s, v) => s + Number(v.precioFinal), 0),
      porEstado: {
        pendiente: ventas.filter((v) => v.estado === EstadoVenta.PENDIENTE)
          .length,
        pagado: ventas.filter((v) => v.estado === EstadoVenta.PAGADO).length,
        cancelado: ventas.filter((v) => v.estado === EstadoVenta.CANCELADO)
          .length,
      },
      montoPagado: ventas
        .filter((v) => v.estado === EstadoVenta.PAGADO)
        .reduce((s, v) => s + Number(v.precioFinal), 0),
      montoPendiente: ventas
        .filter((v) => v.estado === EstadoVenta.PENDIENTE)
        .reduce((s, v) => s + Number(v.precioFinal), 0),
    };

    return { resumen, ventas };
  }

  async getDetalleVentas(filtros: FiltrosReporteDto) {
    const where = this.buildWhereVenta(filtros);

    return this.prisma.venta.findMany({
      where,
      include: {
        ...this.includeVentaBase,
        planPago: {
          include: {
            pagos: { orderBy: { fecha_pago: 'asc' } },
          },
        },
        recibos: {
          select: {
            id: true,
            uuid: true,
            urlArchivo: true,
            tipoOperacion: true,
            creado_en: true,
            observaciones: true,
          },
        },
        archivos: {
          select: {
            id: true,
            urlArchivo: true,
            tipoArchivo: true,
            nombreArchivo: true,
          },
        },
        ingresos: {
          select: { id: true, monto: true, fecha: true, descripcion: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVentasPorVendedor(filtros: FiltrosReporteDto) {
    const where = this.buildWhereVenta(filtros);

    const ventas = await this.prisma.venta.findMany({
      where,
      select: {
        id: true,
        precioFinal: true,
        estado: true,
        createdAt: true,
        inmuebleTipo: true,
        asesor: { select: { id: true, fullName: true, telefono: true } },
        lote: {
          select: {
            numeroLote: true,
            manzano: { select: { nombre: true } },
            ciudad: true,
          },
        },
        propiedad: { select: { nombre: true, ciudad: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    type GrupoVendedor = {
      asesor: { id: number; fullName: string; telefono: string };
      totalVentas: number;
      montoTotal: number;
      ventasPagadas: number;
      ventasPendientes: number;
      detalle: typeof ventas;
    };

    const mapa = new Map<number, GrupoVendedor>();

    for (const v of ventas) {
      const key = v.asesor.id;
      if (!mapa.has(key)) {
        mapa.set(key, {
          asesor: v.asesor,
          totalVentas: 0,
          montoTotal: 0,
          ventasPagadas: 0,
          ventasPendientes: 0,
          detalle: [],
        });
      }
      const g = mapa.get(key)!;
      g.totalVentas += 1;
      g.montoTotal += Number(v.precioFinal);
      if (v.estado === EstadoVenta.PAGADO) g.ventasPagadas += 1;
      if (v.estado === EstadoVenta.PENDIENTE) g.ventasPendientes += 1;
      g.detalle.push(v);
    }

    return {
      resumen: {
        totalVendedores: mapa.size,
        totalVentas: ventas.length,
        montoTotal: ventas.reduce((s, v) => s + Number(v.precioFinal), 0),
      },
      vendedores: Array.from(mapa.values()).sort(
        (a, b) => b.montoTotal - a.montoTotal,
      ),
    };
  }

 async getCuotasPorCobrar(filtros: FiltrosReporteDto) {
  const whereVenta = this.buildWhereVenta(filtros);

  const planes = await this.prisma.planPago.findMany({
    where: {
      estado: { in: ['ACTIVO', 'MOROSO'] },
      venta: whereVenta,
    },
    include: {
      venta: {
        include: {
          cliente: {
            select: { id: true, fullName: true, ci: true, telefono: true },
          },
          asesor: { select: { id: true, fullName: true } },
          lote: {
            select: {
              numeroLote: true,
              manzano: { select: { nombre: true } },
              ciudad: true,
              urbanizacion: { select: { nombre: true } },
            },
          },
          propiedad: { select: { nombre: true, ciudad: true } },
        },
      },
      pagos: { orderBy: { fecha_pago: 'asc' } },
      cuotas: { orderBy: [{ tipo: 'asc' }, { numero: 'asc' }] },
    },
    orderBy: { fechaVencimiento: 'asc' },
  });

  const resultado = planes.map((plan) => {
    const totalPagado = plan.pagos.reduce((s, p) => s + Number(p.monto), 0);
    const saldoPendiente = Number(plan.total) - totalPagado;
    const estaVencido = plan.fechaVencimiento
      ? new Date(plan.fechaVencimiento) < new Date()
      : false;

    const cuotasVencidas = plan.cuotas.filter((c) => c.estado === 'VENCIDA');
    const cuotasPendientes = plan.cuotas.filter((c) => c.estado === 'PENDIENTE');

    return {
      planId: plan.id_plan_pago,
      uuid: plan.uuid,
      estado: plan.estado,
      total: Number(plan.total),
      montoInicial: Number(plan.montoInicial),
      numeroCuotas: plan.numeroCuotas,
      modalidadPrincipal: plan.modalidadPrincipal,
      fechaPrimeraCuota: plan.fechaPrimeraCuota,
      fechaVencimiento: plan.fechaVencimiento,
      totalPagado,
      saldoPendiente,
      porcentajePagado:
        Number(plan.total) > 0
          ? Math.round((totalPagado / Number(plan.total)) * 100)
          : 0,
      estaVencido,
      cantidadPagos: plan.pagos.length,
      cuotasVencidas: cuotasVencidas.length,
      cuotasPendientes: cuotasPendientes.length,
      montoCuotasVencidas: cuotasVencidas.reduce((s, c) => s + Number(c.monto), 0),
      venta: {
        id: plan.venta.id,
        precioFinal: Number(plan.venta.precioFinal),
        estado: plan.venta.estado,
        cliente: plan.venta.cliente,
        asesor: plan.venta.asesor,
        inmuebleTipo: plan.venta.inmuebleTipo,
        inmueble:
          plan.venta.inmuebleTipo === TipoInmueble.LOTE
            ? plan.venta.lote
            : plan.venta.propiedad,
      },
    };
  });

  const resumen = {
    totalPlanes: resultado.length,
    totalPorCobrar: resultado.reduce((s, p) => s + p.saldoPendiente, 0),
    planesVencidos: resultado.filter((p) => p.estaVencido).length,
    montoPlanesVencidos: resultado
      .filter((p) => p.estaVencido)
      .reduce((s, p) => s + p.saldoPendiente, 0),
    planesAlDia: resultado.filter((p) => !p.estaVencido).length,
  };

  return { resumen, cuotas: resultado };
}

  async getVentasCompletadas(filtros: FiltrosReporteDto) {
    const where = this.buildWhereVenta(filtros);
    where.estado = EstadoVenta.PAGADO;

    const ventas = await this.prisma.venta.findMany({
      where,
      include: {
        ...this.includeVentaBase,
        recibos: {
          select: { id: true, uuid: true, urlArchivo: true, creado_en: true },
        },
        ingresos: {
          select: { id: true, monto: true, fecha: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      resumen: {
        totalCompletadas: ventas.length,
        montoTotal: ventas.reduce((s, v) => s + Number(v.precioFinal), 0),
      },
      ventas,
    };
  }

  async getVentasPorCliente(filtros: FiltrosClienteDto) {
    const clienteId = Number(filtros.clienteId);

    const where: Prisma.VentaWhereInput = {
      clienteId,
      estado: { not: EstadoVenta.CANCELADO },
    };

    if (filtros.fechaInicio || filtros.fechaFin) {
      where.createdAt = {
        ...(filtros.fechaInicio && { gte: new Date(filtros.fechaInicio) }),
        ...(filtros.fechaFin && {
          lte: new Date(new Date(filtros.fechaFin).setHours(23, 59, 59, 999)),
        }),
      };
    }

    const [cliente, ventas] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: clienteId },
        select: {
          id: true,
          fullName: true,
          ci: true,
          telefono: true,
          email: true,
          direccion: true,
        },
      }),
      this.prisma.venta.findMany({
        where,
        include: {
          asesor: { select: { id: true, fullName: true, telefono: true } },
         lote: {
  select: {
    id: true,
    numeroLote: true,
    manzano: { select: { nombre: true } }, // 👈 fix
    superficieM2: true,
    precioBase: true,
    ciudad: true,
    urbanizacion: { select: { nombre: true } },
  },
},
          propiedad: {
            select: { id: true, nombre: true, tipo: true, ciudad: true },
          },
          planPago: {
            select: {
              id_plan_pago: true,
              total: true,
              montoInicial: true,
              // plazo: true,

              estado: true,

              // fecha_vencimiento: true,
              pagos: { orderBy: { fecha_pago: 'asc' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const resumen = {
      totalVentas: ventas.length,
      montoTotal: ventas.reduce((s, v) => s + Number(v.precioFinal), 0),
      ventasPagadas: ventas.filter((v) => v.estado === EstadoVenta.PAGADO)
        .length,
      ventasPendientes: ventas.filter((v) => v.estado === EstadoVenta.PENDIENTE)
        .length,
      // tieneCredito: ventas.some((v) => v.planPago !== null),
    };

    return { cliente, resumen, ventas };
  }
}
