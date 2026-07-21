import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import {
  CreateVentaDto,
  EstadoVenta,
  TipoInmueble,
  RegistrarPagoDto,
  MetodoPago,
} from './dto/create-venta.dto';
import {
  UpdatePlanPagoDto,
  PlanInicialDto,
  ModalidadPago,
  TipoCuota,
  EstadoPlanPago,
} from './dto/plan-pago.dto';
import { UpdatePagoPlanDto } from './dto/pago-plan.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  private async crearAuditoria(
    usuarioId: number,
    accion: string,
    tablaAfectada: string,
    registroId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.auditoria.create({
        data: {
          usuarioId,
          accion,
          tablaAfectada,
          registroId,
          ip: ip || '127.0.0.1',
          dispositivo: userAgent || 'API',
        },
      });
    } catch (error) {
      console.error('Error creando auditoría:', error);
    }
  }

  // ⚠ CAMBIO: reemplaza al viejo calcularFechaVencimiento(fechaInicio, plazo,
  // periodicidad). Ahora es genérico y se usa para calcular la fecha de
  // CUALQUIER cuota (Inicial, Principal o Adicional), dado el número de
  // pago (n) dentro de ese bloque.
  private calcularFechaSegunModalidad(
    fechaBase: Date,
    modalidad: ModalidadPago,
    n: number,
  ): Date {
    const fecha = new Date(fechaBase);
    switch (modalidad) {
      case ModalidadPago.DIARIO:
        fecha.setDate(fecha.getDate() + n);
        break;
      case ModalidadPago.SEMANAL:
        fecha.setDate(fecha.getDate() + n * 7);
        break;
      case ModalidadPago.QUINCENAL:
        fecha.setDate(fecha.getDate() + n * 15);
        break;
      case ModalidadPago.MENSUAL:
        fecha.setMonth(fecha.getMonth() + n);
        break;
      case ModalidadPago.BIMESTRAL:
        fecha.setMonth(fecha.getMonth() + n * 2);
        break;
      case ModalidadPago.TRIMESTRAL:
        fecha.setMonth(fecha.getMonth() + n * 3);
        break;
      case ModalidadPago.SEMESTRAL:
        fecha.setMonth(fecha.getMonth() + n * 6);
        break;
      case ModalidadPago.ANUAL:
        fecha.setFullYear(fecha.getFullYear() + n);
        break;
      case ModalidadPago.UNICO:
      default:
        break;
    }
    return fecha;
  }

  private calcularTotalPagado(pagos: any[]): number {
    if (!pagos || !Array.isArray(pagos)) return 0;
    return pagos.reduce(
      (sum: number, pago: any) => sum + Number(pago.monto || 0),
      0,
    );
  }

  private calcularSaldoPendiente(total: number, totalPagado: number): number {
    return Math.max(0, Number(total) - totalPagado);
  }

  private calcularPorcentajePagado(total: number, totalPagado: number): number {
    return Number(total) > 0 ? (totalPagado / Number(total)) * 100 : 0;
  }

  private async verificarCajaActiva(cajaId: number, prisma: any) {
    const caja = await prisma.caja.findUnique({ where: { id: cajaId } });
    if (!caja) {
      throw new BadRequestException(`Caja con ID ${cajaId} no encontrada`);
    }
    if (caja.estado !== 'ABIERTA') {
      throw new BadRequestException(`La caja con ID ${cajaId} no está abierta`);
    }
    return caja;
  }

  private async registrarMovimientoCaja(
    cajaId: number,
    pagoData: any,
    venta: any,
    usuarioId: number,
    prismaClient: any,
    ip?: string,
    userAgent?: string,
  ) {
    const caja = await this.verificarCajaActiva(cajaId, prismaClient);

    let descripcionBase = `Pago de venta #${venta.id} - Cliente: ${venta.cliente?.fullName || venta.clienteId}`;
    if (venta.lote) {
      let manzanoTexto = '';
      if (venta.lote.manzano) {
        manzanoTexto = venta.lote.manzano.replace(/Mzno/gi, 'Manzano');
      }
      if (venta.lote.numeroLote)
        descripcionBase += ` - Lote: ${venta.lote.numeroLote}`;
      if (manzanoTexto) descripcionBase += ` - ${manzanoTexto}`;
      if (venta.lote.urbanizacion?.nombre)
        descripcionBase += ` - Urb: ${venta.lote.urbanizacion.nombre}`;
    } else if (venta.propiedad) {
      descripcionBase += ` - Propiedad: ${venta.propiedad.nombre || venta.propiedad.id}`;
    }

    const movimiento = await prismaClient.movimientoCaja.create({
      data: {
        cajaId,
        usuarioId,
        tipo: 'INGRESO',
        monto: pagoData.monto,
        descripcion: descripcionBase,
        metodoPago: pagoData.metodoPago || 'EFECTIVO',
        referencia: `Venta-${venta.id}-Pago-${pagoData.pagoId || 'Inicial'}`,
        ventaId: venta.id,
      },
    });

    const nuevoSaldo = Number(caja.saldoActual) + Number(pagoData.monto);
    await prismaClient.caja.update({
      where: { id: cajaId },
      data: { saldoActual: nuevoSaldo },
    });

    return movimiento;
  }

  private async revertirMovimientoCaja(
    cajaId: number,
    pagoData: any,
    venta: any,
    usuarioId: number,
    prismaClient: any,
    ip?: string,
    userAgent?: string,
  ) {
    const caja = await this.verificarCajaActiva(cajaId, prismaClient);

    let descripcionBase = `Reversión de pago - Venta #${venta.id} - Pago ID: ${pagoData.pagoId}`;
    if (venta.lote) {
      let manzanoTexto = '';
      if (venta.lote.manzano) {
        manzanoTexto = venta.lote.manzano.replace(/Mzno/gi, 'Manzano');
      }
      if (venta.lote.numeroLote)
        descripcionBase += ` - Lote: ${venta.lote.numeroLote}`;
      if (manzanoTexto) descripcionBase += ` - ${manzanoTexto}`;
    } else if (venta.propiedad) {
      descripcionBase += ` - Propiedad: ${venta.propiedad.nombre || venta.propiedad.id}`;
    }

    const movimiento = await prismaClient.movimientoCaja.create({
      data: {
        cajaId,
        usuarioId,
        tipo: 'EGRESO',
        monto: pagoData.monto,
        descripcion: descripcionBase,
        metodoPago: pagoData.metodoPago || 'EFECTIVO',
        referencia: `Venta-${venta.id}-Reversion-${pagoData.pagoId}`,
        ventaId: venta.id,
      },
    });

    const nuevoSaldo = Number(caja.saldoActual) - Number(pagoData.monto);
    await prismaClient.caja.update({
      where: { id: cajaId },
      data: { saldoActual: nuevoSaldo },
    });

    return movimiento;
  }

  // ⚠ CAMBIO: ya no hay un solo monto_cuota/plazo plano. Ahora se calcula
  // un desglose por bloque (inicial/principal/adicional) a partir de las
  // cuotas reales guardadas (agrupadas por `tipo`), que es la fuente de
  // verdad — no se recalcula analíticamente para evitar que se desincronice
  // si alguna cuota fue editada manualmente.
  private agregarCalculosVenta(venta: any) {
    if (!venta) return venta;
    if (venta.planPago) {
      const plan = venta.planPago;
      const totalPagado = this.calcularTotalPagado(plan.pagos || []);
      const saldoPendiente = this.calcularSaldoPendiente(
        Number(plan.total),
        totalPagado,
      );
      const porcentajePagado = this.calcularPorcentajePagado(
        Number(plan.total),
        totalPagado,
      );

      const cuotas = plan.cuotas || [];
      const cuotasPrincipal = cuotas.filter(
        (c) => c.tipo === TipoCuota.PRINCIPAL,
      );
      const cuotasInicial = cuotas.filter((c) => c.tipo === TipoCuota.INICIAL);
      const cuotasAdicional = cuotas.filter(
        (c) => c.tipo === TipoCuota.ADICIONAL,
      );

      plan.saldo_pendiente = isNaN(saldoPendiente) ? 0 : saldoPendiente;
      plan.total_pagado = isNaN(totalPagado) ? 0 : totalPagado;
      plan.porcentaje_pagado = isNaN(porcentajePagado)
        ? 0
        : Number(porcentajePagado.toFixed(2));

      // Monto de cuota "típico" del Principal, tomando la primera cuota
      // como referencia (la última puede diferir por el ajuste de redondeo)
      plan.monto_cuota_principal = cuotasPrincipal.length
        ? Number(cuotasPrincipal[0].monto)
        : 0;
      plan.cantidad_cuotas_principal = cuotasPrincipal.length;
      plan.monto_cuota_inicial = cuotasInicial.length
        ? Number(cuotasInicial[0].monto)
        : 0;
      plan.monto_cuota_adicional = cuotasAdicional.length
        ? Number(cuotasAdicional[0].monto)
        : 0;

      const hoy = new Date();
      const fechaVenc = plan.fechaVencimiento
        ? new Date(plan.fechaVencimiento)
        : null;
      const diasRestantes = fechaVenc
        ? Math.ceil(
            (fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null;
      plan.dias_restantes =
        diasRestantes !== null ? Math.max(0, diasRestantes) : null;
    }
    return venta;
  }

  private async verificarPermisosUsuario(usuarioId: number, prisma: any) {
    const usuario = await prisma.user.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new ForbiddenException('Usuario no encontrado');
    if (!['ADMINISTRADOR', 'ASESOR'].includes(usuario.role)) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }
    return usuario;
  }

  // ⚠ NUEVO: generador genérico de cuotas para UN bloque (Inicial, Principal
  // o Adicional). Reemplaza al viejo generarCuotas(planPagoId, prisma), que
  // solo sabía generar un cronograma plano.
  private async generarCuotasBloque(
    planPagoId: number,
    tipo: TipoCuota,
    montoTotal: number,
    modalidad: ModalidadPago,
    cantidadPagos: number,
    fechaPrimerPago: Date,
    prisma: any,
  ) {
    if (montoTotal <= 0 || cantidadPagos <= 0) return;
    const montoPorCuota = montoTotal / cantidadPagos;
    let sumaMontos = 0;
    for (let i = 0; i < cantidadPagos; i++) {
      const fechaCuota =
        i === 0
          ? new Date(fechaPrimerPago)
          : this.calcularFechaSegunModalidad(fechaPrimerPago, modalidad, i);
      let monto = montoPorCuota;
      if (i === cantidadPagos - 1) {
        // Ajuste de redondeo en la última cuota del bloque
        monto = montoTotal - sumaMontos;
      }
      await prisma.cuota.create({
        data: {
          plan_pago_id: planPagoId,
          tipo,
          numero: i + 1,
          fecha: fechaCuota,
          monto: Number(monto.toFixed(2)),
          estado: 'PENDIENTE',
        },
      });
      sumaMontos += monto;
    }
  }

  // ⚠ NUEVO: orquesta la generación de los 3 bloques de un PlanPago y deja
  // actualizada la fechaVencimiento del plan (= fecha de la última cuota
  // generada, entre los 3 bloques).
  private async generarTodasLasCuotas(planPago: any, prisma: any) {
    const fechasFin: Date[] = [];

    // Bloque Inicial
    if (planPago.montoInicial > 0) {
      if (planPago.inicialFraccionado) {
        // Ya lo tenías: genera N cuotas fraccionadas
        await this.generarCuotasBloque(
          planPago.id_plan_pago,
          TipoCuota.INICIAL,
          Number(planPago.montoInicial),
          planPago.modalidadInicial,
          planPago.cantidadPagosInicial,
          new Date(planPago.fechaInicioInicial),
          prisma,
        );
        fechasFin.push(
          this.calcularFechaSegunModalidad(
            new Date(planPago.fechaInicioInicial),
            planPago.modalidadInicial,
            planPago.cantidadPagosInicial - 1,
          ),
        );
      } else {
        // 👇 NUEVO: Inicial de pago único (contado o pago inicial simple en
        // crédito) — genera 1 sola cuota para que el reporte cuente "1"
        const fechaUnica = new Date(); // o la fecha del pago si la tienes a mano
        await prisma.cuota.create({
          data: {
            plan_pago_id: planPago.id_plan_pago,
            tipo: TipoCuota.INICIAL,
            numero: 1,
            fecha: fechaUnica,
            monto: Number(planPago.montoInicial),
            estado: 'PENDIENTE', // se actualizará a PAGADA abajo si corresponde
          },
        });
        fechasFin.push(fechaUnica);
      }
    }

    // Bloque Principal (obligatorio si queda saldo por financiar)
    const montoAdicional = planPago.tieneAdicional
      ? Number(planPago.montoAdicional)
      : 0;
    const montoPrincipal =
      Number(planPago.total) - Number(planPago.montoInicial) - montoAdicional;

    if (montoPrincipal > 0) {
      await this.generarCuotasBloque(
        planPago.id_plan_pago,
        TipoCuota.PRINCIPAL,
        montoPrincipal,
        planPago.modalidadPrincipal,
        planPago.numeroCuotas,
        new Date(planPago.fechaPrimeraCuota),
        prisma,
      );
      fechasFin.push(
        this.calcularFechaSegunModalidad(
          new Date(planPago.fechaPrimeraCuota),
          planPago.modalidadPrincipal,
          planPago.numeroCuotas - 1,
        ),
      );
    }

    // Bloque Adicional (opcional)
    if (planPago.tieneAdicional && montoAdicional > 0) {
      await this.generarCuotasBloque(
        planPago.id_plan_pago,
        TipoCuota.ADICIONAL,
        montoAdicional,
        planPago.modalidadAdicional,
        planPago.cantidadPagosAdicional,
        new Date(planPago.fechaInicioAdicional),
        prisma,
      );
      fechasFin.push(
        this.calcularFechaSegunModalidad(
          new Date(planPago.fechaInicioAdicional),
          planPago.modalidadAdicional,
          planPago.cantidadPagosAdicional - 1,
        ),
      );
    }

    if (fechasFin.length > 0) {
      const fechaMaxima = new Date(
        Math.max(...fechasFin.map((f) => f.getTime())),
      );
      await prisma.planPago.update({
        where: { id_plan_pago: planPago.id_plan_pago },
        data: { fechaVencimiento: fechaMaxima },
      });
    }
  }

  private async actualizarEstadoCuotasPorPlan(planPagoId: number, prisma: any) {
    const hoy = new Date();
    await prisma.cuota.updateMany({
      where: {
        plan_pago_id: planPagoId,
        fecha: { lt: hoy },
        estado: 'PENDIENTE',
      },
      data: { estado: 'VENCIDA' },
    });
  }

  private async actualizarEstadoCuota(cuotaId: number, prisma: any) {
    const cuota = await prisma.cuota.findUnique({
      where: { id_cuota: cuotaId },
      include: { pagoCuotas: true },
    });
    if (!cuota) return;

    let totalPagadoCuota = 0;
    for (const pc of cuota.pagoCuotas) {
      totalPagadoCuota += Number(pc.monto_aplicado);
    }
    const montoCuota = Number(cuota.monto);

    let nuevoEstado = 'PENDIENTE';
    if (totalPagadoCuota >= montoCuota) {
      nuevoEstado = 'PAGADA';
    } else if (totalPagadoCuota > 0) {
      nuevoEstado = 'PARCIAL';
    } else {
      const hoy = new Date();
      nuevoEstado = cuota.fecha < hoy ? 'VENCIDA' : 'PENDIENTE';
    }

    if (cuota.estado !== nuevoEstado) {
      await prisma.cuota.update({
        where: { id_cuota: cuotaId },
        data: { estado: nuevoEstado },
      });
    }
  }

  private async aplicarPagoACuotas(
    pagoId: number,
    planPagoId: number,
    montoTotal: number,
    prisma: any,
  ) {
    let montoRestante = montoTotal;
    // Se ordenan por fecha ascendente sin distinguir tipo: en la práctica el
    // Inicial siempre cae primero (fecha más temprana), y el Principal /
    // Adicional se intercalan cronológicamente, que es el orden correcto
    // para aplicar abonos.
    const cuotasPendientes = await prisma.cuota.findMany({
      where: {
        plan_pago_id: planPagoId,
        estado: { in: ['PENDIENTE', 'VENCIDA', 'PARCIAL'] },
      },
      orderBy: { fecha: 'asc' },
    });
    for (const cuota of cuotasPendientes) {
      if (montoRestante <= 0) break;

      const agregado = await prisma.pagoCuota.aggregate({
        where: { cuota_id: cuota.id_cuota },
        _sum: { monto_aplicado: true },
      });
      const saldoCuota =
        Number(cuota.monto) - (agregado._sum.monto_aplicado || 0);
      if (saldoCuota <= 0) continue;

      const aplicar = Math.min(saldoCuota, montoRestante);
      await prisma.pagoCuota.create({
        data: {
          pago_id: pagoId,
          cuota_id: cuota.id_cuota,
          monto_aplicado: aplicar,
        },
      });
      montoRestante -= aplicar;
      await this.actualizarEstadoCuota(cuota.id_cuota, prisma);
    }
    if (montoRestante > 0) {
      throw new BadRequestException(
        `El monto pagado (${montoTotal}) es mayor al saldo pendiente de cuotas`,
      );
    }
  }

  private async revertirAplicacionPago(pagoId: number, prisma: any) {
    const asignaciones = await prisma.pagoCuota.findMany({
      where: { pago_id: pagoId },
    });
    for (const asig of asignaciones) {
      await prisma.pagoCuota.delete({
        where: { id_pago_cuota: asig.id_pago_cuota },
      });
      await this.actualizarEstadoCuota(asig.cuota_id, prisma);
    }
  }

  private async actualizarEstadoPlan(planPagoId: number, prisma: any) {
    const planPago = await prisma.planPago.findUnique({
      where: { id_plan_pago: planPagoId },
      include: { pagos: true, cuotas: true, venta: true },
    });
    if (!planPago) return;
    const totalPagado = this.calcularTotalPagado(planPago.pagos);
    const saldoPendiente = Number(planPago.total) - totalPagado;
    let nuevoEstadoPlan = EstadoPlanPago.ACTIVO;
    let nuevoEstadoVenta = EstadoVenta.PENDIENTE;
    if (saldoPendiente <= 0) {
      nuevoEstadoPlan = EstadoPlanPago.PAGADO;
      nuevoEstadoVenta = EstadoVenta.PAGADO;
    } else if (
      planPago.fechaVencimiento &&
      new Date() > planPago.fechaVencimiento
    ) {
      nuevoEstadoPlan = EstadoPlanPago.MOROSO;
    }
    await prisma.planPago.update({
      where: { id_plan_pago: planPagoId },
      data: { estado: nuevoEstadoPlan, actualizado_en: new Date() },
    });
    await prisma.venta.update({
      where: { id: planPago.ventaId },
      data: { estado: nuevoEstadoVenta },
    });
  }

async create(
  createVentaDto: CreateVentaDto,
  asesorAsignadoId: number,   // va a venta.asesorId
  usuarioCreadorId: number,   // quien realmente está creando la venta (permisos/auditoría)
  ip?: string,
  userAgent?: string,
  voucher?: Express.Multer.File,
) {
  try {
    return await this.prisma.$transaction(
      async (prisma) => {
        // ─── Validar al usuario que está creando la venta ───────────
        const creador = await prisma.user.findFirst({
          where: {
            id: usuarioCreadorId,
            isActive: true,
            role: { in: ['ADMINISTRADOR', 'ASESOR'] },
          },
        });
        if (!creador)
          throw new ForbiddenException(
            'No tienes permisos para crear ventas',
          );

        // ─── Validar el asesor asignado (si es distinto al creador) ─
        let asesorAsignado = creador;
        if (asesorAsignadoId !== usuarioCreadorId) {
          // Un ASESOR no puede asignar la venta a otro asesor, solo a sí mismo
          if (creador.role === 'ASESOR') {
            throw new ForbiddenException(
              'Solo un administrador puede asignar la venta a otro asesor',
            );
          }
          const encontrado = await prisma.user.findFirst({
            where: {
              id: asesorAsignadoId,
              isActive: true,
              role: { in: ['ADMINISTRADOR', 'ASESOR'] },
            },
          });
          if (!encontrado) {
            throw new BadRequestException(
              'El asesor asignado no existe, está inactivo o no tiene un rol válido',
            );
          }
          asesorAsignado = encontrado;
        }

        // ─── Cliente: existente o nuevo ─────────────────────────────
        let cliente: { id: number } | null = null;
        if (createVentaDto.clienteNuevo) {
          const { fullName, ci, telefono, email, direccion } =
            createVentaDto.clienteNuevo;
          const duplicado = await prisma.user.findFirst({
            where: {
              OR: [{ ci }, { telefono }, ...(email ? [{ email }] : [])],
            },
          });
          if (duplicado) {
            throw new BadRequestException(
              `Ya existe un cliente registrado con esa CI, teléfono o email (${duplicado.fullName}). Selecciónelo en vez de crear uno nuevo.`,
            );
          }
          cliente = await prisma.user.create({
            data: {
              fullName,
              ci,
              telefono,
              email,
              direccion,
              role: 'CLIENTE',
            },
          });
        } else {
          cliente = await prisma.user.findFirst({
            where: {
              id: createVentaDto.clienteId,
              isActive: true,
              role: 'CLIENTE',
            },
          });
          if (!cliente)
            throw new BadRequestException(
              'Cliente no encontrado o no tiene rol de CLIENTE',
            );
        }
        // ──────────────────────────────────────────────────────────────

        await this.verificarCajaActiva(createVentaDto.cajaId, prisma);

        if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {
          const lote = await prisma.lote.findFirst({
            where: {
              id: createVentaDto.inmuebleId,
              estado: { in: ['DISPONIBLE', 'CON_OFERTA'] },
            },
          });
          if (!lote) {
            throw new BadRequestException(
              `El lote con ID ${createVentaDto.inmuebleId} no existe o no está disponible`,
            );
          }
        } else if (createVentaDto.inmuebleTipo === TipoInmueble.PROPIEDAD) {
          const propiedad = await prisma.propiedad.findFirst({
            where: {
              id: createVentaDto.inmuebleId,
              estado: { in: ['DISPONIBLE', 'CON_OFERTA'] },
            },
          });
          if (!propiedad) {
            throw new BadRequestException(
              `La propiedad con ID ${createVentaDto.inmuebleId} no existe o no está disponible`,
            );
          }
        }

        // ⚠ VALIDACIÓN CLAVE: inicial + adicional + principal deben sumar
        // exactamente el precioFinal de la venta.
        const { inicial, principal, adicional } = createVentaDto.plan_pago;
        const montoInicial = Number(inicial.montoInicial);
        const montoAdicional = adicional?.activo
          ? Number(adicional.montoAdicional)
          : 0;
        const montoPrincipal =
          Number(createVentaDto.precioFinal) - montoInicial - montoAdicional;

        if (montoInicial < 0 || montoAdicional < 0) {
          throw new BadRequestException(
            'Los montos de Inicial y Adicional no pueden ser negativos',
          );
        }
        if (montoPrincipal < 0) {
          throw new BadRequestException(
            'La suma del Inicial y el Adicional supera el precio final de la venta',
          );
        }
        if (montoPrincipal > 0 && !principal) {
          throw new BadRequestException(
            'Falta configurar el bloque Principal para financiar el saldo restante',
          );
        }
        if (
          inicial.fraccionado &&
          (!inicial.modalidad ||
            !inicial.cantidadPagos ||
            !inicial.fechaInicio)
        ) {
          throw new BadRequestException(
            'Si el Inicial es fraccionado, debe indicar modalidad, cantidad de pagos y fecha de inicio',
          );
        }
        if (
          adicional?.activo &&
          (!adicional.modalidad ||
            !adicional.cantidadPagos ||
            !adicional.fechaInicio)
        ) {
          throw new BadRequestException(
            'Si el Adicional está activo, debe indicar modalidad, cantidad de pagos y fecha de inicio',
          );
        }

        const ventaData: any = {
          clienteId: cliente.id,
          asesorId: asesorAsignadoId,
          inmuebleTipo: createVentaDto.inmuebleTipo,
          precioFinal: createVentaDto.precioFinal,
          estado: createVentaDto.estado || EstadoVenta.PENDIENTE,
          observaciones: createVentaDto.observaciones || null,
          cajaId: createVentaDto.cajaId,
        };
        if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {
          ventaData.loteId = createVentaDto.inmuebleId;
        } else {
          ventaData.propiedadId = createVentaDto.inmuebleId;
        }
        const venta = await prisma.venta.create({ data: ventaData });

        const planPago = await prisma.planPago.create({
          data: {
            ventaId: venta.id,
            total: createVentaDto.precioFinal,

            montoInicial,
            inicialFraccionado: !!inicial.fraccionado,
            modalidadInicial: inicial.fraccionado ? inicial.modalidad : null,
            cantidadPagosInicial: inicial.fraccionado
              ? inicial.cantidadPagos
              : null,
            fechaInicioInicial: inicial.fraccionado
              ? inicial.fechaInicio
              : null,

            modalidadPrincipal: principal?.modalidad ?? ModalidadPago.UNICO,
            numeroCuotas: principal?.numeroCuotas ?? 0,
            fechaPrimeraCuota: principal?.fechaPrimeraCuota ?? new Date(),

            tieneAdicional: !!adicional?.activo,
            montoAdicional: adicional?.activo ? montoAdicional : null,
            modalidadAdicional: adicional?.activo
              ? adicional.modalidad
              : null,
            cantidadPagosAdicional: adicional?.activo
              ? adicional.cantidadPagos
              : null,
            fechaInicioAdicional: adicional?.activo
              ? adicional.fechaInicio
              : null,

            estado: EstadoPlanPago.ACTIVO,
          },
        });

        // Mapea la forma de pago que manda el frontend (EFECTIVO,
        // TRANSFERENCIA_BANCARIA, QR, TARJETA) al enum MetodoPago que
        // maneja la BD (EFECTIVO, TRANSFERENCIA, TARJETA)
        const mapearMetodoPago = (formaPago?: string): MetodoPago => {
          if (!formaPago) return MetodoPago.EFECTIVO;
          if (formaPago === 'TRANSFERENCIA_BANCARIA' || formaPago === 'QR')
            return MetodoPago.TRANSFERENCIA;
          if (formaPago === 'TARJETA') return MetodoPago.TARJETA;
          return MetodoPago.EFECTIVO;
        };
        const metodoPago = mapearMetodoPago(createVentaDto.pago?.formaPago);
        const observacionPagoInicial = createVentaDto.pago
          ? [
              'Pago inicial',
              createVentaDto.pago.bancoDestino,
              `Comprobante ${createVentaDto.pago.comprobante} N° ${createVentaDto.pago.numeroComprobante}`,
              createVentaDto.pago.codigoOperacion
                ? `Cód. Operación: ${createVentaDto.pago.codigoOperacion}`
                : null,
              createVentaDto.pago.observacionPago || null,
            ]
              .filter(Boolean)
              .join(' — ')
          : 'Pago inicial';
        const fechaPagoInicial = createVentaDto.pago?.fechaHoraPago
          ? new Date(createVentaDto.pago.fechaHoraPago)
          : new Date();

        // Inicial NO fraccionado y con pago inmediato → se cobra de una
        // vez, como pago directo. Si "ventaSinPagoInmediato" viene en
        // true, se registra el plan pero NO se crea el pago ni el
        // movimiento de caja todavía (el cliente pagará después).
        const planPagoParaGenerar = await prisma.planPago.findUnique({
          where: { id_plan_pago: planPago.id_plan_pago },
        });
        await this.generarTodasLasCuotas(planPagoParaGenerar, prisma);

        // Guarda el voucher (si se adjuntó) como Archivo ligado a la venta
        if (voucher) {
          await prisma.archivo.create({
            data: {
              ventaId: venta.id,
              urlArchivo: `/uploads/vouchers/${voucher.filename}`,
              tipoArchivo: voucher.mimetype,
              nombreArchivo: voucher.originalname,
            },
          });
        }

        // ⚠ REORDENADO: si hay pago inmediato (sea el Inicial completo de una
        // vez, o solo el primer abono de un Inicial fraccionado), se registra
        // el PagoPlanPago + movimiento de caja, y LUEGO se aplica ese monto a
        // la(s) cuota(s) del Inicial ya generadas arriba — igual que se hace
        // para pagos posteriores en crearPagoPlan().
        if (montoInicial > 0 && !createVentaDto.pago?.ventaSinPagoInmediato) {
          // El monto realmente pagado HOY. Si el frontend manda un
          // "montoTotalVenta" en pago (pensado como "lo que se paga ahora"),
          // se usa ese; si no, se asume que se paga el Inicial completo.
          const montoPagadoHoy = createVentaDto.pago?.montoTotalVenta
            ? Number(createVentaDto.pago.montoTotalVenta)
            : montoInicial;

          if (montoPagadoHoy > montoInicial) {
            throw new BadRequestException(
              `El monto pagado hoy (${montoPagadoHoy}) no puede ser mayor al Inicial total (${montoInicial})`,
            );
          }

          const pagoInicial = await prisma.pagoPlanPago.create({
            data: {
              plan_pago_id: planPago.id_plan_pago,
              monto: montoPagadoHoy,
              fecha_pago: fechaPagoInicial,
              observacion: observacionPagoInicial,
              metodoPago,
            },
          });

          // 👇 se registra con usuarioCreadorId: quien físicamente cobra
          // y opera la caja es quien está logueado, no necesariamente el
          // asesor asignado a la venta.
          await this.registrarMovimientoCaja(
            createVentaDto.cajaId,
            { monto: montoPagadoHoy, metodoPago, pagoId: pagoInicial.id_pago_plan },
            venta,
            usuarioCreadorId,
            prisma,
            ip,
            userAgent,
          );

          await this.aplicarPagoACuotas(
            pagoInicial.id_pago_plan,
            planPago.id_plan_pago,
            montoPagadoHoy,
            prisma,
          );
        }

        // Si no hay nada que financiar (todo se cubrió con el Inicial al contado)
        if (
          montoPrincipal === 0 &&
          montoAdicional === 0 &&
          !inicial.fraccionado
        ) {
          await prisma.planPago.update({
            where: { id_plan_pago: planPago.id_plan_pago },
            data: { estado: EstadoPlanPago.PAGADO },
          });
          await prisma.venta.update({
            where: { id: venta.id },
            data: { estado: EstadoVenta.PAGADO },
          });
        }

        if (createVentaDto.inmuebleTipo === TipoInmueble.LOTE) {
          await prisma.lote.update({
            where: { id: createVentaDto.inmuebleId },
            data: { estado: 'VENDIDO' },
          });
        } else {
          await prisma.propiedad.update({
            where: { id: createVentaDto.inmuebleId },
            data: { estado: 'VENDIDO' },
          });
        }

        // 👇 auditoría con usuarioCreadorId: quien realizó la acción
        await this.crearAuditoria(
          usuarioCreadorId,
          'CREAR_VENTA',
          'Venta',
          venta.id,
          ip,
          userAgent,
        );

        const ventaCompleta = await prisma.venta.findUnique({
          where: { id: venta.id },
          include: {
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
                email: true,
                telefono: true,
              },
            },
            lote:
              createVentaDto.inmuebleTipo === TipoInmueble.LOTE
                ? { include: { urbanizacion: true } }
                : false,
            propiedad: createVentaDto.inmuebleTipo === TipoInmueble.PROPIEDAD,
            planPago: { include: { pagos: true, cuotas: true } },
            archivos: true,
            caja: { select: { id: true, nombre: true, estado: true } },
          },
        });

        return {
          success: true,
          message: 'Venta creada correctamente',
          data: this.agregarCalculosVenta(ventaCompleta),
        };
      },
      { timeout: 180000 },
    );
  } catch (error) {
    if (
      error instanceof BadRequestException ||
      error instanceof ForbiddenException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
    console.error('Error en create venta:', error);
    throw new InternalServerErrorException('Error interno del servidor');
  }
}

  async findAll(
    clienteId?: number,
    asesorId?: number,
    page: number = 1,
    limit: number = 10,
    usuarioId?: number,
    usuarioRole?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};
      if (clienteId) where.clienteId = clienteId;
      if (asesorId) where.asesorId = asesorId;
      if (usuarioRole === 'ASESOR') {
        throw new ForbiddenException('No tienes permisos para ver ventas');
      }

      const [ventas, total] = await Promise.all([
        this.prisma.venta.findMany({
          where,
          skip,
          take: limit,
          include: {
            cliente: {
              select: { id: true, fullName: true, ci: true, telefono: true },
            },
            asesor: {
              select: { id: true, fullName: true, email: true, telefono: true },
            },
            lote: {
              include: {
                urbanizacion: {
                  select: { id: true, nombre: true, ubicacion: true },
                },
              },
            },
            propiedad: true,
            planPago: {
              include: {
                pagos: { orderBy: { fecha_pago: 'desc' } },
                cuotas: { orderBy: { fecha: 'asc' } },
              },
            },
            archivos: true,
            caja: { select: { id: true, nombre: true, estado: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.venta.count({ where }),
      ]);
      const ventasConCalculos = ventas.map((venta) =>
        this.agregarCalculosVenta(venta),
      );
      return {
        success: true,
        data: {
          ventas: ventasConCalculos,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      };
    } catch (error) {
      console.error('Error en findAll ventas:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async findOne(id: number) {
    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id },
        include: {
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
            select: { id: true, fullName: true, email: true, telefono: true },
          },
          lote: {
            include: {
              urbanizacion: {
                select: {
                  id: true,
                  nombre: true,
                  ubicacion: true,
                  descripcion: true,
                },
              },
            },
          },
          propiedad: true,
          planPago: {
            include: {
              pagos: { orderBy: { fecha_pago: 'desc' } },
              cuotas: { orderBy: { fecha: 'asc' } },
            },
          },
          archivos: true,
          caja: { select: { id: true, nombre: true, estado: true } },
        },
      });
      if (!venta)
        throw new NotFoundException(`Venta con ID ${id} no encontrada`);
      return {
        success: true,
        data: { venta: this.agregarCalculosVenta(venta) },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en findOne venta:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerCronograma(ventaId: number) {
    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          planPago: {
            include: { cuotas: { orderBy: { fecha: 'asc' } }, pagos: true },
          },
        },
      });
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (!venta.planPago)
        throw new BadRequestException('La venta no tiene plan de pagos');
      await this.actualizarEstadoCuotasPorPlan(
        venta.planPago.id_plan_pago,
        this.prisma,
      );
      const cuotasActualizadas = await this.prisma.cuota.findMany({
        where: { plan_pago_id: venta.planPago.id_plan_pago },
        orderBy: { fecha: 'asc' },
      });
      // Agrupadas por tipo para que el frontend pinte las 3 secciones fácil
      return {
        success: true,
        data: {
          ventaId: venta.id,
          planPagoId: venta.planPago.id_plan_pago,
          cronograma: cuotasActualizadas,
          cronogramaPorTipo: {
            inicial: cuotasActualizadas.filter(
              (c) => c.tipo === TipoCuota.INICIAL,
            ),
            principal: cuotasActualizadas.filter(
              (c) => c.tipo === TipoCuota.PRINCIPAL,
            ),
            adicional: cuotasActualizadas.filter(
              (c) => c.tipo === TipoCuota.ADICIONAL,
            ),
          },
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Error al obtener cronograma');
    }
  }

 async update(
  id: number,
  updateVentaDto: UpdateVentaDto,
  usuarioId: number,
  ip?: string,
  userAgent?: string,
) {
  try {
    return await this.prisma.$transaction(
      async (prisma) => {
        const ventaExistente = await prisma.venta.findUnique({
          where: { id },
          include: { planPago: true },
        });
        if (!ventaExistente)
          throw new NotFoundException(`Venta con ID ${id} no encontrada`);
        const usuario = await this.verificarPermisosUsuario(
          usuarioId,
          prisma,
        );
        if (
          usuario.role === 'ASESOR' &&
          ventaExistente.asesorId !== usuarioId
        )
          throw new ForbiddenException(
            'Solo puedes actualizar tus propias ventas',
          );

        if (updateVentaDto.clienteId) {
          const cliente = await prisma.user.findFirst({
            where: {
              id: updateVentaDto.clienteId,
              isActive: true,
              role: 'CLIENTE',
            },
          });
          if (!cliente)
            throw new BadRequestException(
              'Cliente no encontrado o no tiene rol de CLIENTE',
            );
        }

        // ─── Reasignación de asesor (solo ADMINISTRADOR) ─────────────
        if (updateVentaDto.asesorId !== undefined) {
          if (usuario.role !== 'ADMINISTRADOR') {
            throw new ForbiddenException(
              'Solo un administrador puede reasignar el asesor de una venta',
            );
          }
          const nuevoAsesor = await prisma.user.findFirst({
            where: {
              id: updateVentaDto.asesorId,
              isActive: true,
              role: { in: ['ADMINISTRADOR', 'ASESOR'] },
            },
          });
          if (!nuevoAsesor) {
            throw new BadRequestException(
              'El asesor a asignar no existe, está inactivo o no tiene un rol válido',
            );
          }
        }
        // ──────────────────────────────────────────────────────────────

        const updateData: any = {};
        if (updateVentaDto.clienteId !== undefined)
          updateData.clienteId = updateVentaDto.clienteId;
        if (updateVentaDto.asesorId !== undefined)
          updateData.asesorId = updateVentaDto.asesorId;
        if (updateVentaDto.precioFinal !== undefined) {
          updateData.precioFinal = updateVentaDto.precioFinal;
          // ⚠ Nota: cambiar precioFinal desde acá SOLO actualiza el total
          // del plan. Si ya hay cuotas de Principal/Adicional generadas,
          // sus montos NO se recalculan automáticamente — hazlo a través
          // de actualizarPlanPago() para mantener la suma correcta.
          if (ventaExistente.planPago) {
            await prisma.planPago.update({
              where: { id_plan_pago: ventaExistente.planPago.id_plan_pago },
              data: { total: updateVentaDto.precioFinal },
            });
          }
        }
        if (updateVentaDto.precioListaLote !== undefined)
          updateData.precioListaLote = updateVentaDto.precioListaLote;
        if (updateVentaDto.estado !== undefined)
          updateData.estado = updateVentaDto.estado;
        if (updateVentaDto.observaciones !== undefined)
          updateData.observaciones = updateVentaDto.observaciones;

        if (Object.keys(updateData).length === 0) {
          const ventaSinCambios = await prisma.venta.findUnique({
            where: { id },
            include: {
              cliente: true,
              asesor: true,
              lote: { include: { urbanizacion: true } },
              propiedad: true,
              planPago: { include: { pagos: true, cuotas: true } },
              archivos: true,
              caja: { select: { id: true, nombre: true, estado: true } },
            },
          });
          return {
            success: true,
            message: 'No se realizaron cambios',
            data: { venta: this.agregarCalculosVenta(ventaSinCambios) },
          };
        }

        const ventaActualizada = await prisma.venta.update({
          where: { id },
          data: updateData,
          include: {
            cliente: true,
            asesor: true,
            lote: { include: { urbanizacion: true } },
            propiedad: true,
            planPago: { include: { pagos: true, cuotas: true } },
            archivos: true,
            caja: { select: { id: true, nombre: true, estado: true } },
          },
        });
        await this.crearAuditoria(
          usuarioId,
          updateVentaDto.asesorId !== undefined
            ? 'REASIGNAR_ASESOR_VENTA'
            : 'ACTUALIZAR_VENTA',
          'Venta',
          id,
          ip,
          userAgent,
        );
        return {
          success: true,
          message: 'Venta actualizada correctamente',
          data: { venta: this.agregarCalculosVenta(ventaActualizada) },
        };
      },
      { timeout: 180000 },
    );
  } catch (error) {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ForbiddenException
    )
      throw error;
    console.error('Error en update venta:', error);
    throw new InternalServerErrorException('Error interno del servidor');
  }
}

  // ⚠ REESCRITO: antes recibía un `number` plano. Ahora recibe el
  // PlanInicialDto completo, porque el Inicial ya puede tener su propio
  // cronograma fraccionado (no solo un monto suelto al contado).
  async actualizarMontoInicialPlanPago(
    ventaId: number,
    nuevoInicial: PlanInicialDto,
    cajaId: number,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (prisma) => {
          const venta = await prisma.venta.findUnique({
            where: { id: ventaId },
            include: {
              planPago: {
                include: {
                  pagos: { orderBy: { fecha_pago: 'asc' } },
                  cuotas: true,
                },
              },
            },
          });
          if (!venta)
            throw new NotFoundException(
              `Venta con ID ${ventaId} no encontrada`,
            );
          if (!venta.planPago)
            throw new BadRequestException(
              'La venta no tiene un plan de pago asociado',
            );

          const usuario = await this.verificarPermisosUsuario(
            usuarioId,
            prisma,
          );
          if (usuario.role === 'ASESOR' && venta.asesorId !== usuarioId)
            throw new ForbiddenException(
              'Solo puedes actualizar tus propias ventas',
            );
          if (!venta.cajaId)
            throw new BadRequestException(
              'La venta no tiene una caja asociada',
            );
          await this.verificarCajaActiva(venta.cajaId, prisma);

          const plan = venta.planPago;

          // No permitir tocar el Inicial si ya hay cuotas INICIAL pagadas o
          // parciales, o si el pago único inicial ya se registró junto con
          // otros pagos del plan (señal de que el ciclo de cobro ya avanzó)
          const cuotasInicialTocadas = plan.cuotas.some(
            (c) =>
              c.tipo === TipoCuota.INICIAL &&
              ['PAGADA', 'PARCIAL'].includes(c.estado),
          );
          if (cuotasInicialTocadas) {
            throw new BadRequestException(
              'No se puede modificar el Inicial: ya existen cuotas del Inicial pagadas o con abono parcial',
            );
          }
          if (
            plan.pagos.some((p) => !p.observacion?.startsWith('Pago inicial'))
          ) {
            throw new BadRequestException(
              'No se puede modificar el Inicial porque ya hay otros pagos registrados en el plan',
            );
          }

          const montoInicialActual = Number(plan.montoInicial);
          const montoInicialNuevo = Number(nuevoInicial.montoInicial);
          const montoAdicionalActual = plan.tieneAdicional
            ? Number(plan.montoAdicional)
            : 0;
          const montoPrincipalNuevo =
            Number(plan.total) - montoInicialNuevo - montoAdicionalActual;

          if (montoPrincipalNuevo < 0) {
            throw new BadRequestException(
              'El nuevo Inicial, sumado al Adicional, supera el total de la venta',
            );
          }

          // 1) Revertir/ajustar el pago único inicial existente (si lo había)
          const pagoInicialExistente = await prisma.pagoPlanPago.findFirst({
            where: {
              plan_pago_id: plan.id_plan_pago,
              observacion: { startsWith: 'Pago inicial' },
            },
          });
          const diferencia = montoInicialNuevo - montoInicialActual;

          if (!nuevoInicial.fraccionado) {
            if (pagoInicialExistente && diferencia !== 0) {
              await prisma.pagoPlanPago.update({
                where: { id_pago_plan: pagoInicialExistente.id_pago_plan },
                data: { monto: montoInicialNuevo },
              });
              if (diferencia > 0) {
                await this.registrarMovimientoCaja(
                  venta.cajaId,
                  {
                    monto: diferencia,
                    metodoPago: 'EFECTIVO',
                    pagoId: pagoInicialExistente.id_pago_plan,
                  },
                  venta,
                  usuarioId,
                  prisma,
                  ip,
                  userAgent,
                );
              } else {
                await this.revertirMovimientoCaja(
                  venta.cajaId,
                  {
                    monto: Math.abs(diferencia),
                    pagoId: pagoInicialExistente.id_pago_plan,
                  },
                  venta,
                  usuarioId,
                  prisma,
                  ip,
                  userAgent,
                );
              }
            } else if (!pagoInicialExistente && montoInicialNuevo > 0) {
              const nuevoPago = await prisma.pagoPlanPago.create({
                data: {
                  plan_pago_id: plan.id_plan_pago,
                  monto: montoInicialNuevo,
                  fecha_pago: new Date(),
                  observacion: 'Pago inicial',
                  metodoPago: 'EFECTIVO',
                },
              });
              await this.registrarMovimientoCaja(
                venta.cajaId,
                {
                  monto: montoInicialNuevo,
                  metodoPago: 'EFECTIVO',
                  pagoId: nuevoPago.id_pago_plan,
                },
                venta,
                usuarioId,
                prisma,
                ip,
                userAgent,
              );
            }
          }

          // 2) Borrar cuotas INICIAL previas (ninguna pagada, ya lo validamos) y PRINCIPAL,
          // porque el monto a financiar en el Principal cambió
          await prisma.cuota.deleteMany({
            where: { plan_pago_id: plan.id_plan_pago, tipo: TipoCuota.INICIAL },
          });
          await prisma.cuota.deleteMany({
            where: {
              plan_pago_id: plan.id_plan_pago,
              tipo: TipoCuota.PRINCIPAL,
            },
          });

          // 3) Guardar la nueva config del Inicial en el plan
          await prisma.planPago.update({
            where: { id_plan_pago: plan.id_plan_pago },
            data: {
              montoInicial: montoInicialNuevo,
              inicialFraccionado: !!nuevoInicial.fraccionado,
              modalidadInicial: nuevoInicial.fraccionado
                ? nuevoInicial.modalidad
                : null,
              cantidadPagosInicial: nuevoInicial.fraccionado
                ? nuevoInicial.cantidadPagos
                : null,
              fechaInicioInicial: nuevoInicial.fraccionado
                ? nuevoInicial.fechaInicio
                : null,
              actualizado_en: new Date(),
            },
          });

          // 4) Regenerar Inicial (si fraccionado) y Principal con los montos nuevos
          const planActualizado = await prisma.planPago.findUnique({
            where: { id_plan_pago: plan.id_plan_pago },
          });
          await this.generarTodasLasCuotas(planActualizado, prisma);
          // generarTodasLasCuotas también regenera el Adicional; como no lo
          // tocamos aquí duplicaría cuotas, así que lo evitamos borrando
          // primero las que ya existían del Adicional antes de regenerar
          // -- ver nota abajo.

          await this.actualizarEstadoPlan(plan.id_plan_pago, prisma);
          await this.crearAuditoria(
            usuarioId,
            'ACTUALIZAR_INICIAL_PLAN_PAGO',
            'PlanPago',
            plan.id_plan_pago,
            ip,
            userAgent,
          );

          const ventaActualizada = await prisma.venta.findUnique({
            where: { id: ventaId },
            include: {
              planPago: {
                include: {
                  pagos: { orderBy: { fecha_pago: 'asc' } },
                  cuotas: { orderBy: { fecha: 'asc' } },
                },
              },
            },
          });
          return {
            success: true,
            message: 'Inicial actualizado correctamente',
            data: { venta: this.agregarCalculosVenta(ventaActualizada) },
          };
        },
        { timeout: 180000 },
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error en actualizarMontoInicialPlanPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

async remove(
  id: number,
  cajaId: number,
  usuarioId: number,
  ip?: string,
  userAgent?: string,
) {
  try {
    return await this.prisma.$transaction(
      async (prisma) => {
        const venta = await prisma.venta.findUnique({
          where: { id },
          include: {
            planPago: { include: { pagos: true, cuotas: true } },
            archivos: true,
            ingresos: true,
          },
        });
        if (!venta)
          throw new NotFoundException(`Venta con ID ${id} no encontrada`);
        const usuario = await this.verificarPermisosUsuario(
          usuarioId,
          prisma,
        );
        if (usuario.role === 'ASESOR' && venta.asesorId !== usuarioId)
          throw new ForbiddenException(
            'Solo puedes eliminar tus propias ventas',
          );

        // ⚠ CAMBIO: la verificación de caja ya no se hace acá arriba de
        // forma incondicional. Se movió adentro del bloque que realmente
        // necesita revertir un movimiento de caja (ver más abajo). Así,
        // una venta "sin pago inmediato" (0 pagos registrados) se puede
        // eliminar aunque la caja original ya esté cerrada, porque no hay
        // ningún monto que revertir en ella.

        if (venta.planPago && venta.planPago.pagos.length > 0) {
          const totalPagado = this.calcularTotalPagado(venta.planPago.pagos);
          if (totalPagado > 0) {
            if (!venta.cajaId)
              throw new BadRequestException(
                'La venta no tiene una caja asociada',
              );
            await this.verificarCajaActiva(venta.cajaId, prisma);

            await this.revertirMovimientoCaja(
              venta.cajaId,
              { monto: totalPagado, pagoId: 0 },
              venta,
              usuarioId,
              prisma,
              ip,
              userAgent,
            );
          }
          for (const pago of venta.planPago.pagos) {
            await this.revertirAplicacionPago(pago.id_pago_plan, prisma);
          }
          await prisma.pagoPlanPago.deleteMany({
            where: { plan_pago_id: venta.planPago.id_plan_pago },
          });
          await prisma.cuota.deleteMany({
            where: { plan_pago_id: venta.planPago.id_plan_pago },
          });
          await prisma.planPago.delete({
            where: { id_plan_pago: venta.planPago.id_plan_pago },
          });
        } else if (venta.planPago) {
          // Plan de pago existe pero sin ningún pago registrado (p. ej.
          // venta de confianza / sin pago inmediato): se borran cuotas y
          // el plan directamente, sin pasar por caja.
          await prisma.cuota.deleteMany({
            where: { plan_pago_id: venta.planPago.id_plan_pago },
          });
          await prisma.planPago.delete({
            where: { id_plan_pago: venta.planPago.id_plan_pago },
          });
        }

        await prisma.movimientoCaja.deleteMany({ where: { ventaId: id } });
        await prisma.ingreso.deleteMany({ where: { ventaId: id } });
        await prisma.recibo.deleteMany({ where: { ventaId: id } });
        await prisma.archivo.deleteMany({ where: { ventaId: id } });

        if (venta.inmuebleTipo === TipoInmueble.LOTE && venta.loteId) {
          await prisma.lote.update({
            where: { id: venta.loteId },
            data: { estado: 'DISPONIBLE' },
          });
        } else if (
          venta.inmuebleTipo === TipoInmueble.PROPIEDAD &&
          venta.propiedadId
        ) {
          await prisma.propiedad.update({
            where: { id: venta.propiedadId },
            data: { estado: 'DISPONIBLE' },
          });
        }

        await prisma.venta.delete({ where: { id } });
        await this.crearAuditoria(
          usuarioId,
          'ELIMINAR_VENTA',
          'Venta',
          id,
          ip,
          userAgent,
        );
        return { success: true, message: 'Venta eliminada correctamente' };
      },
      { timeout: 180000 },
    );
  } catch (error) {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ForbiddenException
    )
      throw error;
    console.error('Error en remove venta:', error);
    throw new InternalServerErrorException('Error interno del servidor');
  }
}

  async crearPagoPlan(
    registrarPagoDto: RegistrarPagoDto,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (prisma) => {
          const usuario = await prisma.user.findUnique({
            where: { id: usuarioId },
          });
          if (!usuario) throw new ForbiddenException('Usuario no encontrado');
          if (!['ADMINISTRADOR', 'SECRETARIA'].includes(usuario.role)) {
            throw new ForbiddenException(
              'No tienes permisos para registrar pagos',
            );
          }

          const planPago = await prisma.planPago.findUnique({
            where: { id_plan_pago: registrarPagoDto.plan_pago_id },
            include: {
              venta: {
                include: {
                  cliente: true,
                  asesor: true,
                  lote: { include: { urbanizacion: true } },
                  propiedad: true,
                },
              },
              pagos: true,
              cuotas: true,
            },
          });
          if (!planPago)
            throw new NotFoundException(
              `Plan de pago con ID ${registrarPagoDto.plan_pago_id} no encontrado`,
            );
          if (
            usuario.role === 'ASESOR' &&
            planPago.venta.asesorId !== usuarioId
          ) {
            throw new ForbiddenException(
              'Solo puedes registrar pagos en tus propias ventas',
            );
          }
          if (planPago.estado !== EstadoPlanPago.ACTIVO) {
            throw new BadRequestException(
              `El plan de pago no está activo. Estado actual: ${planPago.estado}`,
            );
          }
          if (!planPago.venta.cajaId)
            throw new BadRequestException(
              'La venta no tiene una caja asociada',
            );
          const cajaId = planPago.venta.cajaId;
          await this.verificarCajaActiva(cajaId, prisma);

          const totalPagado = this.calcularTotalPagado(planPago.pagos);
          const saldoPendiente = this.calcularSaldoPendiente(
            Number(planPago.total),
            totalPagado,
          );
          if (registrarPagoDto.monto <= 0)
            throw new BadRequestException('El monto debe ser mayor a cero');
          if (registrarPagoDto.monto > saldoPendiente) {
            throw new BadRequestException(
              `El monto a pagar (Bs. ${registrarPagoDto.monto}) excede el saldo pendiente (Bs. ${saldoPendiente})`,
            );
          }
          const fechaPago = registrarPagoDto.fecha_pago || new Date();
          const hoy = new Date();
          const maxFechaPermitida = new Date(hoy);
          maxFechaPermitida.setDate(maxFechaPermitida.getDate() + 90);
          if (fechaPago > maxFechaPermitida) {
            throw new BadRequestException(
              'La fecha de pago no puede ser más de 90 días en el futuro',
            );
          }

          const pagoData: any = {
            plan_pago_id: registrarPagoDto.plan_pago_id,
            monto: registrarPagoDto.monto,
            fecha_pago: fechaPago,
            observacion: registrarPagoDto.observacion || null,
          };
          if (registrarPagoDto.metodoPago)
            pagoData.metodoPago = registrarPagoDto.metodoPago;

          const pago = await prisma.pagoPlanPago.create({ data: pagoData });
          await this.registrarMovimientoCaja(
            cajaId,
            {
              monto: registrarPagoDto.monto,
              metodoPago: registrarPagoDto.metodoPago || 'EFECTIVO',
              pagoId: pago.id_pago_plan,
            },
            planPago.venta,
            usuarioId,
            prisma,
            ip,
            userAgent,
          );
          await this.aplicarPagoACuotas(
            pago.id_pago_plan,
            planPago.id_plan_pago,
            registrarPagoDto.monto,
            prisma,
          );
          await this.actualizarEstadoPlan(planPago.id_plan_pago, prisma);
          await this.crearAuditoria(
            usuarioId,
            'CREAR_PAGO',
            'PagoPlanPago',
            pago.id_pago_plan,
            ip,
            userAgent,
          );

          const planActualizado = await prisma.planPago.findUnique({
            where: { id_plan_pago: registrarPagoDto.plan_pago_id },
            include: {
              pagos: { orderBy: { fecha_pago: 'asc' } },
              cuotas: { orderBy: { fecha: 'asc' } },
              venta: true,
            },
          });
          return {
            success: true,
            message: 'Pago registrado correctamente',
            data: {
              pago,
              planPago: this.agregarCalculosVenta({ planPago: planActualizado })
                .planPago,
            },
          };
        },
        { timeout: 180000 },
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Error en crearPagoPlan:', error);
      throw new InternalServerErrorException(
        'Error interno del servidor al crear el pago',
      );
    }
  }

  async obtenerPago(pagoId: number) {
    try {
      const pago = await this.prisma.pagoPlanPago.findUnique({
        where: { id_pago_plan: pagoId },
        include: {
          planPago: {
            include: {
              venta: {
                include: {
                  cliente: { select: { id: true, fullName: true } },
                  asesor: { select: { id: true, fullName: true } },
                },
              },
            },
          },
        },
      });
      if (!pago)
        throw new NotFoundException(`Pago con ID ${pagoId} no encontrado`);
      return { success: true, data: { pago } };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en obtenerPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerPagosPlan(planPagoId: number) {
    try {
      const planPago = await this.prisma.planPago.findUnique({
        where: { id_plan_pago: planPagoId },
        include: {
          pagos: { orderBy: { fecha_pago: 'desc' } },
          cuotas: { orderBy: { fecha: 'asc' } },
          venta: {
            include: {
              cliente: {
                select: { id: true, fullName: true, ci: true, telefono: true },
              },
              asesor: { select: { id: true, fullName: true } },
            },
          },
        },
      });
      if (!planPago)
        throw new NotFoundException(
          `Plan de pago con ID ${planPagoId} no encontrado`,
        );
      const planConCalculos = this.agregarCalculosVenta({ planPago });
      return {
        success: true,
        data: { pagos: planPago.pagos, planPago: planConCalculos.planPago },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en obtenerPagosPlan:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async actualizarPagoPlan(
    pagoId: number,
    updatePagoPlanDto: UpdatePagoPlanDto,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (prisma) => {
          const usuario = await this.verificarPermisosUsuario(
            usuarioId,
            prisma,
          );
          const pagoExistente = await prisma.pagoPlanPago.findUnique({
            where: { id_pago_plan: pagoId },
            include: {
              planPago: {
                include: {
                  venta: {
                    include: {
                      lote: { include: { urbanizacion: true } },
                      propiedad: true,
                    },
                  },
                  pagos: { orderBy: { fecha_pago: 'asc' } },
                  cuotas: true,
                },
              },
            },
          });
          if (!pagoExistente)
            throw new NotFoundException(`Pago con ID ${pagoId} no encontrado`);
          if (
            usuario.role === 'ASESOR' &&
            pagoExistente.planPago.venta.asesorId !== usuarioId
          )
            throw new ForbiddenException(
              'Solo puedes actualizar pagos de tus propias ventas',
            );
          if (pagoExistente.planPago.estado === EstadoPlanPago.PAGADO)
            throw new BadRequestException(
              'No se puede actualizar un pago de un plan ya pagado',
            );

          const montoAnterior = Number(pagoExistente.monto);
          let diferenciaMonto = 0;
          if (updatePagoPlanDto.monto !== undefined) {
            const otrosPagos = pagoExistente.planPago.pagos.filter(
              (p) => p.id_pago_plan !== pagoId,
            );
            const totalOtrosPagos = this.calcularTotalPagado(otrosPagos);
            const nuevoTotal =
              totalOtrosPagos + Number(updatePagoPlanDto.monto);
            if (nuevoTotal > Number(pagoExistente.planPago.total))
              throw new BadRequestException(
                `El nuevo monto excede el total del plan. Máximo permitido: ${Number(pagoExistente.planPago.total) - totalOtrosPagos}`,
              );
            diferenciaMonto = Number(updatePagoPlanDto.monto) - montoAnterior;
          }
          if (!pagoExistente.planPago.venta.cajaId)
            throw new BadRequestException(
              'La venta no tiene una caja asociada',
            );
          const cajaId = pagoExistente.planPago.venta.cajaId;

          if (diferenciaMonto !== 0) {
            await this.revertirMovimientoCaja(
              cajaId,
              { monto: montoAnterior, pagoId },
              pagoExistente.planPago.venta,
              usuarioId,
              prisma,
              ip,
              userAgent,
            );
            await this.revertirAplicacionPago(pagoId, prisma);
          }

          const updateData: any = {};
          if (updatePagoPlanDto.monto !== undefined)
            updateData.monto = updatePagoPlanDto.monto;
          if (updatePagoPlanDto.fecha_pago !== undefined)
            updateData.fecha_pago = updatePagoPlanDto.fecha_pago;
          if (updatePagoPlanDto.observacion !== undefined)
            updateData.observacion = updatePagoPlanDto.observacion;
          if (updatePagoPlanDto.metodoPago !== undefined)
            updateData.metodoPago = updatePagoPlanDto.metodoPago;

          const pagoActualizado = await prisma.pagoPlanPago.update({
            where: { id_pago_plan: pagoId },
            data: updateData,
          });

          if (diferenciaMonto !== 0) {
            await this.registrarMovimientoCaja(
              cajaId,
              {
                monto: Number(updatePagoPlanDto.monto),
                pagoId,
                metodoPago: updatePagoPlanDto.metodoPago || 'EFECTIVO',
              },
              pagoExistente.planPago.venta,
              usuarioId,
              prisma,
              ip,
              userAgent,
            );
            await this.aplicarPagoACuotas(
              pagoId,
              pagoExistente.planPago.id_plan_pago,
              Number(updatePagoPlanDto.monto),
              prisma,
            );
          }

          await this.actualizarEstadoPlan(
            pagoExistente.planPago.id_plan_pago,
            prisma,
          );
          await this.crearAuditoria(
            usuarioId,
            'ACTUALIZAR_PAGO',
            'PagoPlanPago',
            pagoId,
            ip,
            userAgent,
          );
          return {
            success: true,
            message: 'Pago actualizado correctamente',
            data: { pago: pagoActualizado },
          };
        },
        { timeout: 180000 },
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error en actualizarPagoPlan:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async eliminarPagoPlan(
    pagoId: number,
    cajaId: number,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (prisma) => {
          const usuario = await this.verificarPermisosUsuario(
            usuarioId,
            prisma,
          );
          const pago = await prisma.pagoPlanPago.findUnique({
            where: { id_pago_plan: pagoId },
            include: {
              planPago: {
                include: {
                  venta: {
                    include: {
                      lote: { include: { urbanizacion: true } },
                      propiedad: true,
                    },
                  },
                  pagos: { orderBy: { fecha_pago: 'asc' } },
                },
              },
            },
          });
          if (!pago)
            throw new NotFoundException(`Pago con ID ${pagoId} no encontrado`);
          if (
            usuario.role === 'ASESOR' &&
            pago.planPago.venta.asesorId !== usuarioId
          )
            throw new ForbiddenException(
              'Solo puedes eliminar pagos de tus propias ventas',
            );
          if (pago.planPago.estado === EstadoPlanPago.PAGADO)
            throw new BadRequestException(
              'No se puede eliminar un pago de un plan ya pagado',
            );
          if (!pago.planPago.venta.cajaId)
            throw new BadRequestException(
              'La venta no tiene una caja asociada',
            );
          const cajaOriginalId = pago.planPago.venta.cajaId;
          await this.verificarCajaActiva(cajaOriginalId, prisma);

          await this.revertirMovimientoCaja(
            cajaOriginalId,
            { monto: pago.monto, pagoId },
            pago.planPago.venta,
            usuarioId,
            prisma,
            ip,
            userAgent,
          );
          await this.revertirAplicacionPago(pagoId, prisma);
          await prisma.pagoPlanPago.delete({ where: { id_pago_plan: pagoId } });
          await this.actualizarEstadoPlan(pago.planPago.id_plan_pago, prisma);
          await this.crearAuditoria(
            usuarioId,
            'ELIMINAR_PAGO',
            'PagoPlanPago',
            pagoId,
            ip,
            userAgent,
          );
          return { success: true, message: 'Pago eliminado correctamente' };
        },
        { timeout: 180000 },
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error en eliminarPagoPlan:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  // ⚠ REESCRITO POR COMPLETO: ahora recibe el UpdatePlanPagoDto con los 3
  // bloques opcionales (inicial/principal/adicional). Por cada bloque
  // presente en el body: 1) valida que no tenga cuotas ya PAGADA/PARCIAL,
  // 2) borra sus cuotas PENDIENTE/VENCIDA, 3) guarda su nueva config.
  // Al final SIEMPRE recalcula el monto del Principal (total - inicial -
  // adicional) y regenera sus cuotas, salvo que el Principal ya tenga
  // abonos (en cuyo caso se bloquea con un mensaje claro).
  async actualizarPlanPago(
    planPagoId: number,
    updatePlanPagoDto: UpdatePlanPagoDto,
    usuarioId: number,
    ip?: string,
    userAgent?: string,
  ) {
    try {
      return await this.prisma.$transaction(
        async (prisma) => {
          const usuario = await this.verificarPermisosUsuario(
            usuarioId,
            prisma,
          );
          const planPago = await prisma.planPago.findUnique({
            where: { id_plan_pago: planPagoId },
            include: { venta: true, pagos: true, cuotas: true },
          });
          if (!planPago)
            throw new NotFoundException(
              `Plan de pago con ID ${planPagoId} no encontrado`,
            );
          if (
            usuario.role === 'ASESOR' &&
            planPago.venta.asesorId !== usuarioId
          )
            throw new ForbiddenException(
              'Solo puedes actualizar planes de pago de tus propias ventas',
            );
          if (planPago.estado === EstadoPlanPago.PAGADO)
            throw new BadRequestException(
              'No se puede actualizar un plan de pago ya pagado',
            );

          const tieneCuotasTocadas = (tipo: TipoCuota) =>
            planPago.cuotas.some(
              (c) =>
                c.tipo === tipo && ['PAGADA', 'PARCIAL'].includes(c.estado),
            );

          const dataUpdate: any = { actualizado_en: new Date() };
          let montoInicialEfectivo = Number(planPago.montoInicial);
          let montoAdicionalEfectivo = planPago.tieneAdicional
            ? Number(planPago.montoAdicional)
            : 0;

          // --- Bloque Inicial ---
          if (updatePlanPagoDto.inicial) {
            if (tieneCuotasTocadas(TipoCuota.INICIAL)) {
              throw new BadRequestException(
                'No se puede modificar el Inicial: ya tiene cuotas pagadas o con abono parcial',
              );
            }
            const nuevoInicial = updatePlanPagoDto.inicial;
            montoInicialEfectivo = Number(nuevoInicial.montoInicial);
            dataUpdate.montoInicial = montoInicialEfectivo;
            dataUpdate.inicialFraccionado = !!nuevoInicial.fraccionado;
            dataUpdate.modalidadInicial = nuevoInicial.fraccionado
              ? nuevoInicial.modalidad
              : null;
            dataUpdate.cantidadPagosInicial = nuevoInicial.fraccionado
              ? nuevoInicial.cantidadPagos
              : null;
            dataUpdate.fechaInicioInicial = nuevoInicial.fraccionado
              ? nuevoInicial.fechaInicio
              : null;
            await prisma.cuota.deleteMany({
              where: { plan_pago_id: planPagoId, tipo: TipoCuota.INICIAL },
            });
          }

          // --- Bloque Adicional ---
          if (updatePlanPagoDto.adicional) {
            if (tieneCuotasTocadas(TipoCuota.ADICIONAL)) {
              throw new BadRequestException(
                'No se puede modificar el Adicional: ya tiene cuotas pagadas o con abono parcial',
              );
            }
            const nuevoAdicional = updatePlanPagoDto.adicional;
            montoAdicionalEfectivo = nuevoAdicional.activo
              ? Number(nuevoAdicional.montoAdicional)
              : 0;
            dataUpdate.tieneAdicional = !!nuevoAdicional.activo;
            dataUpdate.montoAdicional = nuevoAdicional.activo
              ? montoAdicionalEfectivo
              : null;
            dataUpdate.modalidadAdicional = nuevoAdicional.activo
              ? nuevoAdicional.modalidad
              : null;
            dataUpdate.cantidadPagosAdicional = nuevoAdicional.activo
              ? nuevoAdicional.cantidadPagos
              : null;
            dataUpdate.fechaInicioAdicional = nuevoAdicional.activo
              ? nuevoAdicional.fechaInicio
              : null;
            await prisma.cuota.deleteMany({
              where: { plan_pago_id: planPagoId, tipo: TipoCuota.ADICIONAL },
            });
          }

          // --- Bloque Principal (explícito o recalculado por cambios arriba) ---
          const montoPrincipalNuevo =
            Number(planPago.total) -
            montoInicialEfectivo -
            montoAdicionalEfectivo;
          if (montoPrincipalNuevo < 0) {
            throw new BadRequestException(
              'La suma del Inicial y el Adicional supera el total de la venta',
            );
          }

          const principalCambia =
            !!updatePlanPagoDto.principal ||
            updatePlanPagoDto.inicial !== undefined ||
            updatePlanPagoDto.adicional !== undefined;

          if (principalCambia) {
            if (tieneCuotasTocadas(TipoCuota.PRINCIPAL)) {
              throw new BadRequestException(
                'No se puede recalcular el Principal: ya tiene cuotas pagadas o con abono parcial. Ajusta manualmente o revierte esos pagos primero.',
              );
            }
            if (updatePlanPagoDto.principal) {
              dataUpdate.modalidadPrincipal =
                updatePlanPagoDto.principal.modalidad;
              dataUpdate.numeroCuotas =
                updatePlanPagoDto.principal.numeroCuotas;
              dataUpdate.fechaPrimeraCuota =
                updatePlanPagoDto.principal.fechaPrimeraCuota;
            }
            await prisma.cuota.deleteMany({
              where: { plan_pago_id: planPagoId, tipo: TipoCuota.PRINCIPAL },
            });
          }

          await prisma.planPago.update({
            where: { id_plan_pago: planPagoId },
            data: dataUpdate,
          });

          if (
            updatePlanPagoDto.inicial ||
            updatePlanPagoDto.adicional ||
            principalCambia
          ) {
            const planParaGenerar = await prisma.planPago.findUnique({
              where: { id_plan_pago: planPagoId },
            });
            await this.generarTodasLasCuotas(planParaGenerar, prisma);
          }

          await this.actualizarEstadoPlan(planPagoId, prisma);
          await this.crearAuditoria(
            usuarioId,
            'ACTUALIZAR_PLAN_PAGO',
            'PlanPago',
            planPagoId,
            ip,
            userAgent,
          );

          const planFinal = await prisma.planPago.findUnique({
            where: { id_plan_pago: planPagoId },
            include: { pagos: true, cuotas: true, venta: true },
          });
          return {
            success: true,
            message: 'Plan de pago actualizado correctamente',
            data: {
              planPago: this.agregarCalculosVenta({ planPago: planFinal })
                .planPago,
            },
          };
        },
        { timeout: 180000 },
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error en actualizarPlanPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerResumenPlanPago(ventaId: number) {
    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          planPago: {
            include: {
              pagos: { orderBy: { fecha_pago: 'asc' } },
              cuotas: { orderBy: { fecha: 'asc' } },
            },
          },
          cliente: {
            select: { id: true, fullName: true, email: true, telefono: true },
          },
          asesor: { select: { id: true, fullName: true } },
          lote: {
            include: {
              urbanizacion: { select: { nombre: true, ubicacion: true } },
            },
          },
          propiedad: true,
        },
      });
      if (!venta)
        throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`);
      if (!venta.planPago)
        throw new BadRequestException(
          'La venta no tiene un plan de pago asociado',
        );

      const ventaConCalculos = this.agregarCalculosVenta(venta);
      const planPago = ventaConCalculos.planPago;
      return {
        success: true,
        data: {
          venta: {
            id: venta.id,
            precioFinal: venta.precioFinal,
            estado: venta.estado,
            cliente: venta.cliente,
            asesor: venta.asesor,
            lote: venta.lote,
            propiedad: venta.propiedad,
            observaciones: venta.observaciones,
          },
          planPago,
          resumen: {
            total: Number(planPago.total),
            totalPagado: planPago.total_pagado,
            saldoPendiente: planPago.saldo_pendiente,
            porcentajePagado: planPago.porcentaje_pagado,
            cantidadPagos: planPago.pagos.length,
            estado: planPago.estado,
            montoInicial: Number(planPago.montoInicial),
            montoAdicional: planPago.tieneAdicional
              ? Number(planPago.montoAdicional)
              : 0,
            fechaVencimiento: planPago.fechaVencimiento,
            diasRestantes: planPago.dias_restantes,
            estaCompletamentePagado: planPago.saldo_pendiente <= 0,
            montoCuotaPrincipal: planPago.monto_cuota_principal,
            cantidadCuotasPrincipal: planPago.cantidad_cuotas_principal,
            cuotas: venta.planPago.cuotas,
          },
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Error en obtenerResumenPlanPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerPlanesPagoActivos(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      const [planesPago, total] = await Promise.all([
        this.prisma.planPago.findMany({
          where: { estado: EstadoPlanPago.ACTIVO },
          skip,
          take: limit,
          include: {
            venta: {
              include: {
                cliente: {
                  select: { id: true, fullName: true, telefono: true },
                },
                asesor: { select: { id: true, fullName: true } },
                lote: {
                  include: {
                    urbanizacion: { select: { nombre: true, ubicacion: true } },
                  },
                },
                propiedad: true,
              },
            },
            pagos: { orderBy: { fecha_pago: 'desc' } },
            cuotas: { orderBy: { fecha: 'asc' } },
          },
          orderBy: { fechaVencimiento: 'asc' },
        }),
        this.prisma.planPago.count({
          where: { estado: EstadoPlanPago.ACTIVO },
        }),
      ]);
      const planesConCalculos = planesPago.map(
        (plan) => this.agregarCalculosVenta({ planPago: plan }).planPago,
      );
      return {
        success: true,
        data: {
          planesPago: planesConCalculos,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      };
    } catch (error) {
      console.error('Error en obtenerPlanesPagoActivos:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async verificarMorosidadPlanPago(ventaId: number) {
    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id: ventaId },
        include: { planPago: { include: { cuotas: true, pagos: true } } },
      });
      if (!venta?.planPago)
        throw new BadRequestException(
          'La venta no tiene un plan de pago asociado',
        );
      const planPago = venta.planPago;
      const hoy = new Date();
      await this.actualizarEstadoCuotasPorPlan(
        planPago.id_plan_pago,
        this.prisma,
      );
      if (
        planPago.fechaVencimiento &&
        hoy > planPago.fechaVencimiento &&
        planPago.estado === EstadoPlanPago.ACTIVO
      ) {
        await this.prisma.planPago.update({
          where: { id_plan_pago: planPago.id_plan_pago },
          data: { estado: EstadoPlanPago.MOROSO },
        });
        return {
          success: true,
          data: {
            estado: EstadoPlanPago.MOROSO,
            mensaje: 'El plan de pago ha sido marcado como moroso',
          },
        };
      }
      return {
        success: true,
        data: {
          estado: planPago.estado,
          mensaje: 'El plan de pago está en estado normal',
        },
      };
    } catch (error) {
      console.error('Error en verificarMorosidadPlanPago:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerVentasPorCliente(clienteId: number) {
    try {
      const ventas = await this.prisma.venta.findMany({
        where: { clienteId },
        include: {
          asesor: { select: { id: true, fullName: true, telefono: true } },
          lote: {
            include: {
              urbanizacion: { select: { nombre: true, ubicacion: true } },
            },
          },
          propiedad: true,
          planPago: {
            include: {
              pagos: { orderBy: { fecha_pago: 'desc' } },
              cuotas: { orderBy: { fecha: 'asc' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      const ventasConCalculos = ventas.map((venta) =>
        this.agregarCalculosVenta(venta),
      );
      return { success: true, data: { ventas: ventasConCalculos } };
    } catch (error) {
      console.error('Error en obtenerVentasPorCliente:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerCajasActivas() {
    try {
      const cajas = await this.prisma.caja.findMany({
        where: { estado: 'ABIERTA' },
        include: {
          usuarioApertura: {
            select: { id: true, fullName: true, username: true, role: true },
          },
        },
        orderBy: { nombre: 'asc' },
      });
      return { success: true, data: { cajas } };
    } catch (error) {
      console.error('Error en obtenerCajasActivas:', error);
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async obtenerVentasParaCobros(filtros: {
    cliente?: string;
    lote?: string;
    urbanizacion?: string;
    encargado?: string;
  }) {
    const where: any = {};
    const include: any = {
      cliente: {
        select: { id: true, fullName: true, ci: true, telefono: true },
      },
      asesor: {
        select: { id: true, fullName: true, email: true, telefono: true },
      },
      lote: {
        include: {
          urbanizacion: { select: { id: true, nombre: true, ubicacion: true } },
        },
      },
      propiedad: true,
      planPago: {
        include: {
          pagos: { orderBy: { fecha_pago: 'desc' } },
          cuotas: { orderBy: { fecha: 'asc' } },
        },
      },
      caja: { select: { id: true, nombre: true, estado: true } },
    };

    if (filtros.cliente) {
      where.cliente = {
        OR: [
          { fullName: { contains: filtros.cliente, mode: 'insensitive' } },
          { ci: { contains: filtros.cliente, mode: 'insensitive' } },
        ],
      };
    }
    if (filtros.encargado) {
      where.asesor = {
        fullName: { contains: filtros.encargado, mode: 'insensitive' },
      };
    }
    if (filtros.lote || filtros.urbanizacion) {
      const loteWhere: any = {};
      if (filtros.lote)
        loteWhere.numeroLote = { contains: filtros.lote, mode: 'insensitive' };
      if (filtros.urbanizacion)
        loteWhere.urbanizacion = {
          nombre: { contains: filtros.urbanizacion, mode: 'insensitive' },
        };
      where.lote = loteWhere;
    }

    const ventas = await this.prisma.venta.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      data: { ventas: ventas.map((v) => this.agregarCalculosVenta(v)) },
    };
  }
}
