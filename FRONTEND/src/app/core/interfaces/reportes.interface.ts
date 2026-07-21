// models/reportes.models.ts

// ============================================
// ENTIDADES BASE
// ============================================

export interface Cliente {
  id: number;
  fullName: string;
  ci: string;
  telefono: string;
  email: string;
  direccion?: string;
}

export interface Asesor {
  id: number;
  fullName: string;
  telefono: string;
  email?: string;
}

export interface Urbanizacion {
  id: number;
  nombre: string;
}

export interface Lote {
  id: number;
  numeroLote: string;
  manzano: string;
  superficieM2: number;
  precioBase: number;
  ciudad: string;
  urbanizacion: Urbanizacion;
}

export interface Propiedad {
  id: number;
  nombre: string;
  tipo: string;
  ciudad: string;
  ubicacion: string;
  precio?: number;
}

export interface PlanPago {
  id_plan_pago: number;
  uuid?: string;
  total: number;
  monto_inicial: number;
  plazo: number;
  periodicidad: string;
  estado: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
}

export interface Pago {
  id_pago?: number;
  monto: number;
  fecha_pago: string;
  estado?: string;
  comprobante?: string;
}

// ============================================
// FILTROS
// ============================================

export interface FiltrosReporteDto {
  fechaInicio?: string;
  fechaFin?: string;
  tipoVenta?: string;
  asesorId?: number;
  manzano?: string;
  urbanizacionId?: number;
  ciudad?: string;
  global?: boolean;
}

export interface FiltrosClienteDto {
  clienteId: number;
  fechaInicio?: string;
  fechaFin?: string;
}

// ============================================
// VENTA BASE
// ============================================

export interface Venta {
  id: number;
  precioFinal: number;
  estado: string;
  createdAt: string;
  updatedAt?: string;
  inmuebleTipo: string;
  clienteId?: number;
  asesorId?: number;
  cliente: Cliente;
  asesor: Asesor;
  lote?: Lote;
  propiedad?: Propiedad;
  planPago?: PlanPago;
}

// ============================================
// 1. REPORTE GENERAL DE VENTAS
// ============================================

export interface ResumenVentas {
  totalVentas: number;
  montoTotal: number;
  porEstado: {
    pendiente: number;
    pagado: number;
    cancelado: number;
  };
  montoPagado: number;
  montoPendiente: number;
}

export interface ReporteVentasResponse {
  resumen: ResumenVentas;
  ventas: Venta[];
}

// ============================================
// 2. DETALLE DE VENTAS (COMPLETO)
// ============================================

export interface Recibo {
  id: number;
  uuid: string;
  urlArchivo: string;
  tipoOperacion: string;
  creado_en: string;
  observaciones?: string;
}

export interface Archivo {
  id: number;
  urlArchivo: string;
  tipoArchivo: string;
  nombreArchivo: string;
}

export interface Ingreso {
  id: number;
  monto: number;
  fecha: string;
  descripcion?: string;
}

export interface DetallePlanPago extends PlanPago {
  pagos: Pago[];
}

export interface DetalleVenta extends Venta {
  planPago?: DetallePlanPago;
  recibos: Recibo[];
  archivos: Archivo[];
  ingresos: Ingreso[];
}

// ============================================
// 3. VENTAS POR VENDEDOR
// ============================================

export interface VentaResumida {
  id: number;
  precioFinal: number;
  estado: string;
  createdAt: string;
  inmuebleTipo: string;
  asesor: Asesor;
  lote?: {
    numeroLote: string;
    manzano: string;
    ciudad: string;
  };
  propiedad?: {
    nombre: string;
    ciudad: string;
  };
  cliente?: {
    fullName: string;
  };
}

export interface GrupoVendedor {
  asesor: Asesor;
  totalVentas: number;
  montoTotal: number;
  ventasPagadas: number;
  ventasPendientes: number;
  detalle: VentaResumida[];
}

export interface ResumenVendedores {
  totalVendedores: number;
  totalVentas: number;
  montoTotal: number;
}

export interface VentasPorVendedorResponse {
  resumen: ResumenVendedores;
  vendedores: GrupoVendedor[];
}

// ============================================
// 4. CUOTAS POR COBRAR
// ============================================

export interface InmuebleInfo {
  numeroLote?: string;
  manzano?: string;
  ciudad?: string;
  urbanizacion?: { nombre: string };
  nombre?: string;
  tipo?: string;
}

export interface VentaInfo {
  id: number;
  precioFinal: number;
  estado: string;
  cliente: Cliente;
  asesor: Asesor;
  inmuebleTipo: string;
  inmueble: InmuebleInfo | null;
}

export interface Cuota {
  planId: number;
  uuid: string;
  estado: string;
  total: number;
  montoInicial: number;
  plazo: number;
  periodicidad: string;
  fechaInicio: string;
  fechaVencimiento: string;
  totalPagado: number;
  saldoPendiente: number;
  porcentajePagado: number;
  estaVencido: boolean;
  cantidadPagos: number;
  venta: VentaInfo;
}

export interface ResumenCuotas {
  totalPlanes: number;
  totalPorCobrar: number;
  planesVencidos: number;
  montoPlanesVencidos: number;
  planesAlDia: number;
}

export interface CuotasPorCobrarResponse {
  resumen: ResumenCuotas;
  cuotas: Cuota[];
}

// ============================================
// 5. VENTAS COMPLETADAS (PAGADAS)
// ============================================

export interface ResumenCompletadas {
  totalCompletadas: number;
  montoTotal: number;
}

export interface VentaCompletada extends Venta {
  recibos?: Recibo[];
  ingresos?: Ingreso[];
}

export interface VentasCompletadasResponse {
  resumen: ResumenCompletadas;
  ventas: VentaCompletada[];
}

// ============================================
// 6. VENTAS POR CLIENTE
// ============================================

export interface ResumenCliente {
  totalVentas: number;
  montoTotal: number;
  ventasPagadas: number;
  ventasPendientes: number;
  tieneCredito: boolean;
}

export interface VentaConPlan extends Venta {
  planPago?: DetallePlanPago;
}

export interface VentasPorClienteResponse {
  cliente: Cliente;
  resumen: ResumenCliente;
  ventas: VentaConPlan[];
}

// ============================================
// ESTADOS Y ENUMS
// ============================================

export type EstadoVenta = 'PAGADO' | 'PENDIENTE' | 'CANCELADO';
export type EstadoPlanPago = 'ACTIVO' | 'MOROSO' | 'PAGADO' | 'CANCELADO';
export type Periodicidad = 'MESES' | 'SEMANAS' | 'DIAS';
export type TipoInmueble = 'LOTE' | 'PROPIEDAD';

// ============================================
// UTILITY TYPES
// ============================================

export type ReporteData =
  | ReporteVentasResponse
  | VentasPorVendedorResponse
  | CuotasPorCobrarResponse
  | VentasCompletadasResponse
  | VentasPorClienteResponse
  | DetalleVenta[];

export interface ReporteState {
  loading: boolean;
  error: string | null;
  data: ReporteData | null;
}
