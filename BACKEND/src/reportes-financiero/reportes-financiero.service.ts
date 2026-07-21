import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { FiltroFechaDto } from './dto/Filtro fecha.dto';
import { OtrosIngresosDto } from './dto/Otros Ingresos.dto';
import { RecibosEmitidosDto } from './dto/Recibos emitidos.dto';
import { ReporteCobroCuotasDto } from './dto/reporte cobro cuotas.dto';
import { ReporteGastosDto } from './dto/Reporte gastos';
// Ajusta este import al PrismaService real de tu proyecto NestJS

@Injectable()
export class ReportesFinancierosService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helper de rango de fechas ──────────────────────────────────
  private rangoFechas(fechaInicio?: string, fechaFin?: string) {
    if (!fechaInicio && !fechaFin) return undefined;
    const gte = fechaInicio ? new Date(fechaInicio) : undefined;
    let lte: Date | undefined;
    if (fechaFin) {
      lte = new Date(fechaFin);
      lte.setHours(23, 59, 59, 999); // incluir el día completo de "Fecha de Fin"
    }
    return { ...(gte && { gte }), ...(lte && { lte }) };
  }

  // ── Helper: convierte recursivamente Prisma.Decimal -> number ───
  // Prisma.Decimal serializa a STRING en JSON.stringify (su propio toJSON()),
  // no a number, aunque tus interfaces de frontend digan `number`. Sin esto,
  // cosas como `(monto).toLocaleString(...)` en el PDF fallan silenciosamente
  // porque un string sí tiene `.toLocaleString()`, solo que ignora las
  // opciones de formato Intl y devuelve el string tal cual.
  private serializarDecimales<T>(valor: T): T {
    if (valor === null || valor === undefined) return valor;
    if (valor instanceof Date) return valor;
    if (Array.isArray(valor)) {
      return valor.map((v) => this.serializarDecimales(v)) as unknown as T;
    }
    if (typeof valor === 'object') {
      // Duck-typing de Prisma.Decimal (evita importar el tipo directamente)
      const posibleDecimal = valor as any;
      if (typeof posibleDecimal.toNumber === 'function' && typeof posibleDecimal.toFixed === 'function') {
        return posibleDecimal.toNumber();
      }
      const resultado: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
        resultado[k] = this.serializarDecimales(v);
      }
      return resultado as T;
    }
    return valor;
  }

  // ════════════════════════════════════════════════════════════
  // BLOQUE INGRESOS POR VENTAS (fuente real: PagoPlanPago / MovimientoCaja)
  // ════════════════════════════════════════════════════════════

  // ── 1. REPORTE COBRO DE CUOTAS ────────────────────────────────
  // ESTE es el reporte real de "dinero que entró por ventas de lotes o
  // propiedades". Se basa en PagoPlanPago porque es el único modelo que
  // registra, por cada pago cobrado: monto, fecha, forma de pago, y a qué
  // cuota(s) se aplicó (vía PagoCuota -> Cuota.tipo).
  async reporteCobroCuotas(filtros: ReporteCobroCuotasDto) {
    const pagos = await this.prisma.pagoPlanPago.findMany({
      where: {
        fecha_pago: this.rangoFechas(filtros.fechaInicio, filtros.fechaFin),
        metodoPago: filtros.metodoPago,
        ...(filtros.cajaId && {
          planPago: { venta: { cajaId: filtros.cajaId } },
        }),
        ...(filtros.tipoCuota && {
          pagoCuotas: { some: { cuota: { tipo: filtros.tipoCuota } } },
        }),
      },
      include: {
        planPago: {
          include: {
            venta: {
              include: {
                cliente: { select: { id: true, fullName: true, ci: true } },
                lote: { include: { manzano: true } },
                propiedad: true,
                caja: { select: { id: true, nombre: true } },
              },
            },
          },
        },
        pagoCuotas: { include: { cuota: true } },
      },
      orderBy: { fecha_pago: 'desc' },
    });
    return this.serializarDecimales(pagos);
  }

  // ── 2. INGRESOS POR BANCO/CAJA ────────────────────────────────
  // Se agrupa desde MovimientoCaja (tipo=INGRESO), que es el único modelo
  // que siempre tiene cajaId poblado para cada cobro real. Si un pago fue
  // editado o revertido, existe un MovimientoCaja tipo=EGRESO espejo — acá
  // se muestra el bruto de INGRESO; si necesitas el neto real de caja,
  // hay que restar esos EGRESO de reversión por separado.
  async ingresosPorBanco(filtros: FiltroFechaDto) {
    const agrupado = await this.prisma.movimientoCaja.groupBy({
      by: ['cajaId'],
      where: {
        tipo: 'INGRESO',
        fecha: this.rangoFechas(filtros.fechaInicio, filtros.fechaFin),
      },
      _sum: { monto: true },
      _count: { _all: true },
    });

    const cajas = await this.prisma.caja.findMany({
      where: { id: { in: agrupado.map((g) => g.cajaId) } },
    });

    return agrupado
      .map((g) => ({
        cajaId: g.cajaId,
        nombre: cajas.find((c) => c.id === g.cajaId)?.nombre ?? 'Caja eliminada',
        total: Number(g._sum.monto ?? 0),
        cantidad: g._count._all,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ── 3. RECIBOS EMITIDOS ───────────────────────────────────────
  async recibosEmitidos(filtros: RecibosEmitidosDto) {
    return this.prisma.recibo.findMany({
      where: {
        creado_en: this.rangoFechas(filtros.fechaInicio, filtros.fechaFin),
        tipoOperacion: filtros.tipoOperacion,
      },
      include: {
        venta: { include: { cliente: { select: { id: true, fullName: true, ci: true } } } },
        reserva: { include: { cliente: { select: { id: true, fullName: true, ci: true } } } },
        usuarioRegistro: { select: { id: true, fullName: true } },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  // ════════════════════════════════════════════════════════════
  // BLOQUE "OTROS INGRESOS" (modelo Ingreso, NO ligado a pagos de venta)
  // ════════════════════════════════════════════════════════════
  // VentasService nunca crea filas en Ingreso (solo las borra en cascada al
  // eliminar una venta). Así que esta tabla es para ingresos manuales
  // ajenos al flujo de ventas: alquileres, comisiones, etc.

  // ── 4. OTROS INGRESOS (listado) ───────────────────────────────
  async otrosIngresos(filtros: OtrosIngresosDto) {
    const ingresos = await this.prisma.ingreso.findMany({
      where: {
        fecha: this.rangoFechas(filtros.fechaInicio, filtros.fechaFin),
        categoriaId: filtros.categoriaId,
      },
      include: {
        categoria: true,
        usuario: { select: { id: true, fullName: true } },
        venta: { select: { id: true, precioFinal: true } }, // por si alguna vez se usa
      },
      orderBy: { fecha: 'desc' },
    });
    return this.serializarDecimales(ingresos);
  }

  // ── 5. OTROS INGRESOS POR CONCEPTO ────────────────────────────
  async otrosIngresosPorConcepto(filtros: FiltroFechaDto) {
    const agrupado = await this.prisma.ingreso.groupBy({
      by: ['categoriaId'],
      where: { fecha: this.rangoFechas(filtros.fechaInicio, filtros.fechaFin) },
      _sum: { monto: true },
      _count: { _all: true },
    });

    const categorias = await this.prisma.categoriaContable.findMany({
      where: { id: { in: agrupado.map((g) => g.categoriaId) } },
    });
    const nombrePorId = new Map(categorias.map((c) => [c.id, c.nombre]));

    return agrupado
      .map((g) => ({
        categoriaId: g.categoriaId,
        concepto: nombrePorId.get(g.categoriaId) ?? 'Sin categoría',
        total: Number(g._sum.monto ?? 0),
        cantidad: g._count._all,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ════════════════════════════════════════════════════════════
  // BLOQUE GASTOS (Egreso sí tiene cajaId + metodoPago propios, sin cambios)
  // ════════════════════════════════════════════════════════════

  // ── 6. REPORTE DE GASTOS ──────────────────────────────────────
  async reporteGastos(filtros: ReporteGastosDto) {
    const egresos = await this.prisma.egreso.findMany({
      where: {
        fecha: this.rangoFechas(filtros.fechaInicio, filtros.fechaFin),
        categoriaId: filtros.categoriaId,
        cajaId: filtros.cajaId,
        metodoPago: filtros.metodoPago,
      },
      include: {
        categoria: true,
        caja: true,
        urbanizacion: true,
        usuario: { select: { id: true, fullName: true } },
      },
      orderBy: { fecha: 'desc' },
    });
    return this.serializarDecimales(egresos);
  }

  // ── 7. CONSOLIDADO DE GASTOS ──────────────────────────────────
  async consolidadoGastos(filtros: FiltroFechaDto) {
    const rango = this.rangoFechas(filtros.fechaInicio, filtros.fechaFin);

    const [totales, porCategoria, porCaja] = await Promise.all([
      this.prisma.egreso.aggregate({
        where: { fecha: rango },
        _sum: { monto: true },
        _count: { _all: true },
      }),
      this.prisma.egreso.groupBy({
        by: ['categoriaId'],
        where: { fecha: rango },
        _sum: { monto: true },
      }),
      this.prisma.egreso.groupBy({
        by: ['cajaId'],
        where: { fecha: rango },
        _sum: { monto: true },
      }),
    ]);

    const categoriaIds = porCategoria
      .map((c) => c.categoriaId)
      .filter((id): id is number => id !== null);
    const cajaIds = porCaja.map((c) => c.cajaId).filter((id): id is number => id !== null);

    const [categorias, cajas] = await Promise.all([
      this.prisma.categoriaContable.findMany({ where: { id: { in: categoriaIds } } }),
      this.prisma.caja.findMany({ where: { id: { in: cajaIds } } }),
    ]);

    return {
      totalGastado: Number(totales._sum.monto ?? 0),
      cantidadEgresos: totales._count._all,
      porCategoria: porCategoria
        .map((c) => ({
          categoriaId: c.categoriaId,
          nombre: categorias.find((cat) => cat.id === c.categoriaId)?.nombre ?? 'Sin categoría',
          total: Number(c._sum.monto ?? 0),
        }))
        .sort((a, b) => b.total - a.total),
      porCaja: porCaja
        .map((c) => ({
          cajaId: c.cajaId,
          nombre: cajas.find((caj) => caj.id === c.cajaId)?.nombre ?? 'Sin caja',
          total: Number(c._sum.monto ?? 0),
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  // ── 8. GASTOS POR BANCO ───────────────────────────────────────
  async gastosPorBanco(filtros: FiltroFechaDto) {
    const agrupado = await this.prisma.egreso.groupBy({
      by: ['cajaId'],
      where: { fecha: this.rangoFechas(filtros.fechaInicio, filtros.fechaFin) },
      _sum: { monto: true },
      _count: { _all: true },
    });

    const cajaIds = agrupado.map((g) => g.cajaId).filter((id): id is number => id !== null);
    const cajas = await this.prisma.caja.findMany({ where: { id: { in: cajaIds } } });

    return agrupado
      .map((g) => ({
        cajaId: g.cajaId,
        nombre: cajas.find((c) => c.id === g.cajaId)?.nombre ?? 'Sin caja asignada',
        total: Number(g._sum.monto ?? 0),
        cantidad: g._count._all,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ── 9. GASTOS POR CONCEPTO ─────────────────────────────────────
  async gastosPorConcepto(filtros: FiltroFechaDto) {
    const agrupado = await this.prisma.egreso.groupBy({
      by: ['categoriaId'],
      where: { fecha: this.rangoFechas(filtros.fechaInicio, filtros.fechaFin) },
      _sum: { monto: true },
      _count: { _all: true },
    });

    const categoriaIds = agrupado.map((g) => g.categoriaId).filter((id): id is number => id !== null);
    const categorias = await this.prisma.categoriaContable.findMany({
      where: { id: { in: categoriaIds } },
    });

    return agrupado
      .map((g) => ({
        categoriaId: g.categoriaId,
        concepto: categorias.find((c) => c.id === g.categoriaId)?.nombre ?? 'Sin categoría',
        total: Number(g._sum.monto ?? 0),
        cantidad: g._count._all,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ── Opciones para llenar los <select> del panel de filtros ────
  async opcionesFiltros() {
    const [cajas, categoriasIngreso, categoriasGasto] = await Promise.all([
      this.prisma.caja.findMany({
        select: { id: true, nombre: true, estado: true },
        orderBy: { nombre: 'asc' },
      }),
      // CategoriaContable.tipo es String libre; asume convención 'INGRESO' / 'EGRESO'.
      this.prisma.categoriaContable.findMany({ where: { tipo: 'INGRESO' }, orderBy: { nombre: 'asc' } }),
      this.prisma.categoriaContable.findMany({ where: { tipo: 'EGRESO' }, orderBy: { nombre: 'asc' } }),
    ]);
    return { cajas, categoriasIngreso, categoriasGasto };
  }
}