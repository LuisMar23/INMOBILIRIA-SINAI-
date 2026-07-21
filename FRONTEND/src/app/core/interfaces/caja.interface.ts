// interfaces/caja.interface.ts

export interface Caja {
  id: number;
  nombre: string;
  montoInicial: number;
  saldoActual: number;
  estado: 'ABIERTA' | 'CERRADA';
  usuarioAperturaId: number;
  usuarioApertura?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
  creadoEn?: string;
}

export interface CierreCaja {
  id: number;
  cajaId: number;
  usuarioId: number;
  tipo: 'TOTAL' | 'PARCIAL';
  saldoInicial: number;
  saldoFinal: number;
  saldoReal: number;
  diferencia: number;
  observaciones?: string;
  fechaCierre: string;
  usuario?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
  caja?: {
    id: number;
    nombre: string;
  };
}

// ============================================================
// INTERFAZ COMPLETA DE MOVIMIENTO (CORREGIDA)
// ============================================================
export interface Movimiento {
  id: number;
  cajaId: number;
  usuarioId: number;
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  descripcion?: string;
  metodoPago: string;
  referencia?: string;
  fecha: string  // Puede venir como string o Date
  
  // Relaciones
  usuario?: {
    id: number;
    fullName: string;
    username: string;
    role: string;
  };
  caja?: {
    id: number;
    nombre: string;
  };
  venta?: {
    id: number;
    cliente?: {
      id: number;
      fullName: string;
      ci: string;
      telefono: string;
    };
    lote?: {
      id: number;
      numeroLote: string;
      manzano?: string;
      urbanizacion?: { nombre: string };
    };
    planPago?: {
      id_plan_pago: number;
      total: number;
      monto_inicial: number;
      plazo: number;
      periodicidad: string;
      estado: string;
    };
  };
  egreso?: {
    id: number;
    descripcion: string;
    monto: number;
    categoria?: { id: number; nombre: string };
  };
}

// ============================================================
// INTERFACES PARA RESPUESTA DEL MÉTODO findByCajaFiltrado
// ============================================================

export interface ResumenMovimientos {
  totalIngresos: number;
  totalEgresos: number;
  cantidadIngresos: number;
  cantidadEgresos: number;
  saldoNeto: number;
}

export interface PorMetodoPago {
  metodoPago: string;
  total: number;
  cantidad: number;
}

export interface SaldoDiario {
  dia: string;
  netoDelDia: number;
  saldoAcumulado: number;
}

export interface MovimientosResponse {
  // Paginación
  data: Movimiento[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  
  // Contexto de la caja
  caja: Caja | null;
  
  // Resumen contable
  resumen: ResumenMovimientos;
  porMetodoPago: PorMetodoPago[];
  
  // Serie temporal
  saldoDiario: SaldoDiario[];
}

// ============================================================
// INTERFACES PARA FILTROS
// ============================================================

export interface FiltrosMovimiento {
  mes?: number;
  anio?: number;
  tipo?: 'INGRESO' | 'EGRESO';
  metodoPago?: string;
  manzano?: string;
  numeroLote?: string;
}

export interface FindMovimientosParams {
  cajaId: number;
  page?: number;
  pageSize?: number;
  filtros?: FiltrosMovimiento;
}

// ============================================================
// INTERFACES PARA CREAR MOVIMIENTOS
// ============================================================

export interface CreateIngresoDto {
  cajaId: number;
  monto: number;
  descripcion?: string;
  metodoPago: string;
  referencia?: string;
  ventaId?: number;
}

export interface CreateEgresoDto {
  cajaId: number;
  monto: number;
  descripcion?: string;
  metodoPago: string;
  referencia?: string;
  categoriaId?: number;
}

// ============================================================
// INTERFACES PARA RESPONSE DE API
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface MovimientosApiResponse extends ApiResponse<MovimientosResponse> {}

// ============================================================
// UTILITY TYPES
// ============================================================

export type TipoMovimiento = 'INGRESO' | 'EGRESO';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE';

// Para estadísticas y reportes
export interface EstadisticasMovimiento {
  porTipo: {
    ingresos: { total: number; cantidad: number };
    egresos: { total: number; cantidad: number };
  };
  porMetodoPago: Record<string, { total: number; cantidad: number }>;
  porDia: Record<string, { ingresos: number; egresos: number; neto: number }>;
  porMes: Record<string, { ingresos: number; egresos: number; neto: number }>;
}