import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';

import { addDays, addWeeks, addMonths, isPast } from 'date-fns';
import { ListarCreditosDto, RegistrarPagoDto } from './dto/create-credito.dto';
import { EstadoVenta, PeriodicidadPago, TipoCuota } from 'generated/prisma/client';

type EstadoCuota = 'PAGADA' | 'PENDIENTE' | 'VENCIDA';

export interface CuotaCronograma {
  numeroCuota: number;
  fechaVencimiento: Date;
  monto: number;
  estado: EstadoCuota;
  pagoAsociado: any | null;
}

// Convierte Decimal de Prisma, string o number a number seguro
const toNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val.toNumber === 'function') return val.toNumber();
  return parseFloat(val.toString()) || 0;
};

@Injectable()
export class CreditosService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // LISTAR CRÉDITOS
  // ─────────────────────────────────────────────────────────────
  async listarCreditos(dto: ListarCreditosDto) {
    const ciudad = dto.ciudad;
    const urbanizacion = dto.urbanizacion;
    const urbanizacionId = dto.urbanizacionId
      ? Number(dto.urbanizacionId)
      : undefined;
    const search = dto.search;
    const page = Number(dto.page ?? 1);
    const limit = Number(dto.limit ?? 10);
    const skip = (page - 1) * limit;

    const loteWhere: any = {};
    if (ciudad) loteWhere.ciudad = ciudad;
    if (urbanizacionId) loteWhere.urbanizacionId = urbanizacionId;
    if (urbanizacion) {
      loteWhere.urbanizacion = {
        nombre: { contains: urbanizacion, mode: 'insensitive' },
      };
    }

    const where: any = {
      planPago: { isNot: null },
      estado: { not: EstadoVenta.CANCELADO },
      ...(Object.keys(loteWhere).length > 0 && { lote: loteWhere }),
      ...(search && {
        cliente: {
          fullName: { contains: search, mode: 'insensitive' },
        },
      }),
    };

    const [ventas, total] = await Promise.all([
      this.prisma.venta.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: {
            select: { id: true, fullName: true, telefono: true, ci: true },
          },
          asesor: { select: { id: true, fullName: true } },
          lote: { include: { urbanizacion: { select: { nombre: true } },
            manzano: { select: { nombre: true } },
           } },
          planPago: {
            include: {
              pagos: true,
              cuotas: { orderBy: [{ tipo: 'asc' }, { numero: 'asc' }] },
            },
          },
        },
      }),
      this.prisma.venta.count({ where }),
    ]);

    const data = ventas.map((v) => this.mapCreditoRow(v)).filter(Boolean);

    return {
      ok: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CRONOGRAMA
  // ─────────────────────────────────────────────────────────────
 async getCronograma(ventaId: number) {
  const plan = await this.prisma.planPago.findUnique({
    where: { ventaId },
    include: {
      pagos: { orderBy: { fecha_pago: 'asc' } },
      cuotas: { orderBy: [{ tipo: 'asc' }, { numero: 'asc' }] }, // 👈 agregado
      venta: {
        include: {
          cliente: { select: { id: true, fullName: true, ci: true } },
          lote: { select: { numeroLote: true, manzano: true, ciudad: true } },
        },
      },
    },
  });

  if (!plan) throw new NotFoundException('Plan de pago no encontrado');

  const cuotasPrincipal = plan.cuotas.filter((c) => c.tipo === TipoCuota.PRINCIPAL);
  const montoPagado = plan.pagos.reduce((acc, p) => acc + toNum(p.monto), 0);
  const montoFinanciado = toNum(plan.total) - toNum(plan.montoInicial);

  const cuotasPagadas = plan.cuotas.filter((c) => c.estado === 'PAGADA').length;
  const cuotasPendientes = plan.cuotas.filter((c) => c.estado === 'PENDIENTE').length;
  const cuotasVencidas = plan.cuotas.filter((c) => c.estado === 'VENCIDA').length;

  return {
    ok: true,
    data: {
      planPagoId: plan.id_plan_pago,
      cliente: plan.venta.cliente,
      lote: plan.venta.lote,
      total: toNum(plan.total),
      montoInicial: toNum(plan.montoInicial),
      montoFinanciado,
      montoPagado,
      montoRestante: toNum(plan.total) - montoPagado,
      plazo: plan.numeroCuotas,
      periodicidad: plan.modalidadPrincipal,
      fechaInicio: plan.fechaPrimeraCuota,
      fechaVencimiento: plan.fechaVencimiento,
      estado: plan.estado,
      resumen: { cuotasPagadas, cuotasPendientes, cuotasVencidas },
      // Cronograma del Principal, que es lo que el PDF actual imprime
      cuotas: cuotasPrincipal.map((c) => ({
        numeroCuota: c.numero,
        fechaVencimiento: c.fecha,
        monto: toNum(c.monto),
        estado: c.estado,
      })),
    },
  };
}

  // ─────────────────────────────────────────────────────────────
  // HISTORIAL DE PAGOS
  // ─────────────────────────────────────────────────────────────
  async getHistorialPagos(ventaId: number) {
    const plan = await this.prisma.planPago.findUnique({
      where: { ventaId },
      include: {
        pagos: { orderBy: { fecha_pago: 'desc' } },
        venta: {
          include: {
            cliente: { select: { id: true, fullName: true } },
            lote: { select: { numeroLote: true, manzano: true } },
          },
        },
      },
    });

    if (!plan) throw new NotFoundException('Plan de pago no encontrado');

    const totalPagado = plan.pagos.reduce((acc, p) => acc + toNum(p.monto), 0);
    const montoRestante = toNum(plan.total) - totalPagado;

    return {
      ok: true,
      data: {
        planPagoId: plan.id_plan_pago,
        cliente: plan.venta.cliente,
        lote: plan.venta.lote,
        total: toNum(plan.total),
        totalPagado,
        montoRestante,
        pagos: plan.pagos.map((p) => ({
          id: p.id_pago_plan,
          monto: toNum(p.monto),
          fechaPago: p.fecha_pago,
          metodoPago: p.metodoPago,
          observacion: p.observacion,
        })),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // REGISTRAR PAGO
  // ─────────────────────────────────────────────────────────────
  async registrarPago(
    params: { ventaId: number; usuarioId: number } & RegistrarPagoDto,
  ) {
    const { ventaId, monto, metodoPago, observacion, cajaId, usuarioId } =
      params;

    const plan = await this.prisma.planPago.findUnique({
      where: { ventaId },
      include: { pagos: true },
    });

    if (!plan) throw new NotFoundException('Plan de pago no encontrado');
    if (plan.estado === 'CANCELADO')
      throw new BadRequestException('El plan de pago está cancelado');
    if (plan.estado === 'PAGADO')
      throw new BadRequestException(
        'El plan de pago ya está completamente pagado',
      );

    const montoPagadoActual = plan.pagos.reduce(
      (acc, p) => acc + toNum(p.monto),
      0,
    );
    const restante = toNum(plan.total) - montoPagadoActual;
    const montoNum = toNum(monto);

    if (montoNum > restante) {
      throw new BadRequestException(
        `El monto excede el saldo restante. Restante: ${restante}`,
      );
    }

    const planCompletado = montoPagadoActual + montoNum >= toNum(plan.total);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Registrar el pago
      const pago = await tx.pagoPlanPago.create({
        data: {
          plan_pago_id: plan.id_plan_pago,
          monto: montoNum,
          observacion,
          metodoPago,
        },
      });

      // 2. Movimiento de caja (si viene cajaId)
      if (cajaId) {
        const caja = await tx.caja.findUnique({ where: { id: cajaId } });
        if (!caja || caja.estado !== 'ABIERTA') {
          throw new BadRequestException(
            'La caja no está disponible o está cerrada',
          );
        }

        await tx.movimientoCaja.create({
          data: {
            cajaId,
            usuarioId,
            tipo: 'INGRESO',
            monto: montoNum,
            descripcion: `Pago cuota crédito - Plan #${plan.id_plan_pago}`,
            referencia: `VENTA-${ventaId}`,
            ventaId,
            metodoPago,
          },
        });

        await tx.caja.update({
          where: { id: cajaId },
          data: { saldoActual: { increment: montoNum } },
        });
      }

      // 3. Si se completó el plan → actualizar estados
      if (planCompletado) {
        await tx.planPago.update({
          where: { id_plan_pago: plan.id_plan_pago },
          data: { estado: 'PAGADO' },
        });

        await tx.venta.update({
          where: { id: ventaId },
          data: { estado: EstadoVenta.PAGADO },
        });
      }

      return pago;
    });

    return {
      ok: true,
      data: {
        pagoId: result.id_pago_plan,
        monto: toNum(result.monto),
        fechaPago: result.fecha_pago,
        metodoPago: result.metodoPago,
        planCompletado,
        montoRestante: restante - montoNum,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────────────────────
  private generarCronograma(plan: any): CuotaCronograma[] {
    const { plazo, periodicidad, fecha_inicio, monto_inicial, total, pagos } =
      plan;

    const montoFinanciado = toNum(total) - toNum(monto_inicial);
    const montoCuota = +(montoFinanciado / plazo).toFixed(2);

    const pagosOrdenados = [...pagos].sort(
      (a: any, b: any) =>
        new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime(),
    );

    return Array.from({ length: plazo }, (_, i) => {
      const base = new Date(fecha_inicio);
      let fechaVencimiento: Date;

      switch (periodicidad as PeriodicidadPago) {
        case PeriodicidadPago.DIAS:
          fechaVencimiento = addDays(base, i + 1);
          break;
        case PeriodicidadPago.SEMANAS:
          fechaVencimiento = addWeeks(base, i + 1);
          break;
        case PeriodicidadPago.MESES:
        default:
          fechaVencimiento = addMonths(base, i + 1);
          break;
      }

      const pagoAsociado = pagosOrdenados[i] ?? null;
      let estado: EstadoCuota;

      if (pagoAsociado) {
        estado = 'PAGADA';
      } else if (isPast(fechaVencimiento)) {
        estado = 'VENCIDA';
      } else {
        estado = 'PENDIENTE';
      }

      return {
        numeroCuota: i + 1,
        fechaVencimiento,
        monto: montoCuota,
        estado,
        pagoAsociado: pagoAsociado
          ? {
              id: pagoAsociado.id_pago_plan,
              monto: toNum(pagoAsociado.monto),
              fechaPago: pagoAsociado.fecha_pago,
              metodoPago: pagoAsociado.metodoPago,
            }
          : null,
      };
    });
  }

  // En creditos.service.ts — reemplaza SOLO el método mapCreditoRow

private mapCreditoRow(venta: any) {
  const plan = venta.planPago;
  if (!plan) return null;

  const prioridadTipo: Record<string, number> = { INICIAL: 0, PRINCIPAL: 1, ADICIONAL: 2 };
  const cuotas = plan.cuotas ?? [];

  const cuotasPendientes = cuotas
    .filter((c: any) => ['PENDIENTE', 'VENCIDA', 'PARCIAL'].includes(c.estado))
    .sort((a: any, b: any) => {
      const fa = new Date(a.fecha).getTime();
      const fb = new Date(b.fecha).getTime();
      if (fa !== fb) return fa - fb;
      return prioridadTipo[a.tipo] - prioridadTipo[b.tipo];
    });

  const cuotasVencidas = cuotas.filter((c: any) => c.estado === 'VENCIDA');
  const siguienteCuota = cuotasPendientes[0] ?? null;

  const montoPagado = plan.pagos.reduce((acc: number, p: any) => acc + toNum(p.monto), 0);
  const montoRestante = toNum(plan.total) - montoPagado;

  // ── datos crudos del lote/manzano, para que el front arme el label como quiera ──
  const numeroLote = venta.lote?.numeroLote ?? '';
  const nombreManzano = venta.lote?.manzano?.nombre ?? ''; // 👈 el fix: .nombre agregado

  const loteLabel = venta.lote
    ? `${numeroLote}-${nombreManzano}`.replace(/-$/, '')
    : '-';

  return {
    ventaId: venta.id,
    cliente: venta.cliente.fullName,
    clienteId: venta.cliente.id,
    ci: venta.cliente.ci,
    loteMz: loteLabel,           // se mantiene por compatibilidad (usado en PDFs)
    numeroLote,                  // 👈 nuevo: crudo, para el front
    nombreManzano,                // 👈 nuevo: crudo, para el front
    siguienteCuota: siguienteCuota
      ? {
          fecha: siguienteCuota.fecha,
          monto: toNum(siguienteCuota.monto),
          cuotasVencidas: cuotasVencidas.length,
        }
      : null,
    montoCuotaPendiente: siguienteCuota ? toNum(siguienteCuota.monto) : 0,
    montoRestante,
    totalVenta: toNum(venta.precioFinal),
    planPagoId: plan.id_plan_pago,
    estadoPlan: plan.estado,
    plazo: plan.numeroCuotas,
    periodicidad: plan.modalidadPrincipal,
    fechaInicioPlan: plan.fechaPrimeraCuota,
    montoInicial: toNum(plan.montoInicial),
  };
}
}
