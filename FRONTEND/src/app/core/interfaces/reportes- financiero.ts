// reportes-financieros.interfaces.ts

// ── MetodoPago se importa del proyecto (NO se redeclara acá) ────
// Tu caja.interface.ts ya define MetodoPago con 'CHEQUE' incluido; si acá
// se vuelve a declarar un tipo con el mismo nombre pero distintos literales,
// TypeScript los trata como incompatibles aunque se llamen igual.
// Ajustá esta ruta relativa a donde esté tu archivo real.
import type { MetodoPago } from '../../core/interfaces/caja.interface';
export type { MetodoPago };

// ⚠ OJO: el enum MetodoPago de tu backend (schema.prisma) solo tiene
// EFECTIVO | TRANSFERENCIA | TARJETA — no incluye CHEQUE. Si el usuario
// filtra por 'CHEQUE' en el select, el backend nunca va a matchear nada
// (Prisma rechazaría el valor o simplemente no habrá resultados, según
// cómo lo valide tu DTO). Si CHEQUE es un método real que manejás, hay que
// agregarlo también al enum de Prisma y regenerar el client.

export type TipoCuota = 'INICIAL' | 'PRINCIPAL' | 'ADICIONAL';
export type TipoOperacion = 'VENTA' | 'RESERVA';

// ── Filtros (query params) ──────────────────────────────────────
export interface FiltroFecha {
  fechaInicio?: string; // ISO yyyy-MM-dd
  fechaFin?: string;
}

export interface FiltroCobroCuotas extends FiltroFecha {
  tipoCuota?: TipoCuota;
  metodoPago?: MetodoPago;
  cajaId?: number;
}

export interface FiltroRecibos extends FiltroFecha {
  tipoOperacion?: TipoOperacion;
}

export interface FiltroOtrosIngresos extends FiltroFecha {
  categoriaId?: number;
}

export interface FiltroGastos extends FiltroFecha {
  categoriaId?: number;
  cajaId?: number;
  metodoPago?: string; // Egreso.metodoPago es String, no enum
}

// ── Entidades resumidas usadas dentro de las respuestas ─────────
export interface ClienteResumen {
  id: number;
  fullName: string;
  ci?: string;
}

export interface ManzanoResumen {
  id: number;
  nombre: string;
}

export interface LoteResumen {
  id: number;
  numeroLote: string;
  ciudad?: string;
  manzano?: ManzanoResumen | null;
}

export interface PropiedadResumen {
  id: number;
  nombre: string;
  ciudad?: string;
}

export interface CajaResumen {
  id: number;
  nombre: string;
  estado?: string;
}

export interface UsuarioResumen {
  id: number;
  fullName: string;
}

export interface CategoriaResumen {
  id: number;
  nombre: string;
  tipo?: string;
}

// ── 1. Reporte Cobro Cuotas (PagoPlanPago) ──────────────────────
export interface CuotaResumen {
  id_cuota: number;
  tipo: TipoCuota;
  numero: number;
  fecha: string;
  monto: number;
  estado: string;
}

export interface PagoCuotaResumen {
  id_pago_cuota: number;
  monto_aplicado: number;
  cuota: CuotaResumen;
}

export interface VentaResumenCobro {
  id: number;
  precioFinal: number;
  cliente: ClienteResumen;
  lote?: LoteResumen | null;
  propiedad?: PropiedadResumen | null;
  caja?: CajaResumen | null;
}

export interface PlanPagoResumenCobro {
  id_plan_pago: number;
  venta: VentaResumenCobro;
}

export interface PagoPlanPagoCobro {
  id_pago_plan: number;
  monto: number;
  fecha_pago: string;
  observacion?: string | null;
  metodoPago?: MetodoPago | null;
  planPago: PlanPagoResumenCobro;
  pagoCuotas: PagoCuotaResumen[];
}

// ── 2. Ingresos por Banco (MovimientoCaja) ──────────────────────
export interface IngresoPorBanco {
  cajaId: number | null;
  nombre: string;
  total: number;
  cantidad: number;
}

// ── 3. Recibos Emitidos ──────────────────────────────────────────
export interface ReciboEmitido {
  id: number;
  tipoOperacion: TipoOperacion;
  urlArchivo: string;
  nombreArchivo?: string | null;
  creado_en: string;
  observaciones?: string | null;
  venta?: { id: number; cliente: ClienteResumen } | null;
  reserva?: { id: number; cliente: ClienteResumen } | null;
  usuarioRegistro: UsuarioResumen;
}

// ── 4. Otros Ingresos (modelo Ingreso, no ligado a ventas) ──────
export interface OtroIngreso {
  id: number;
  fecha: string;
  monto: number;
  descripcion: string;
  categoria: CategoriaResumen;
  usuario: UsuarioResumen;
  venta?: { id: number; precioFinal: number } | null;
}

// ── 5. Otros Ingresos por Concepto ──────────────────────────────
export interface OtroIngresoPorConcepto {
  categoriaId: number | null;
  concepto: string;
  total: number;
  cantidad: number;
}

// ── 6. Reporte de Gastos (Egreso) ───────────────────────────────
// NO se redeclara acá: se reusa tu interfaz existente para evitar el mismo
// choque de tipos que pasó con MetodoPago. Ajustá la ruta relativa.
// El service de NestJS (Prisma `.egreso.findMany` con `include`, no `select`)
// ya devuelve TODOS los campos escalares del modelo — incluido `uuid` — así
// que la forma real del JSON debería calzar con tu interfaz completa.
export type { Egreso } from '../../core/interfaces/egresos.interface';

// ── 7. Consolidado de Gastos ────────────────────────────────────
export interface ConsolidadoGastos {
  totalGastado: number;
  cantidadEgresos: number;
  porCategoria: { categoriaId: number | null; nombre: string; total: number }[];
  porCaja: { cajaId: number | null; nombre: string; total: number }[];
}

// ── 8. Gastos por Banco ──────────────────────────────────────────
export interface GastoPorBanco {
  cajaId: number | null;
  nombre: string;
  total: number;
  cantidad: number;
}

// ── 9. Gastos por Concepto ───────────────────────────────────────
export interface GastoPorConcepto {
  categoriaId: number | null;
  concepto: string;
  total: number;
  cantidad: number;
}

// ── Opciones para llenar los <select> del panel de filtros ──────
export interface OpcionesFiltros {
  cajas: CajaResumen[];
  categoriasIngreso: CategoriaResumen[];
  categoriasGasto: CategoriaResumen[];
}