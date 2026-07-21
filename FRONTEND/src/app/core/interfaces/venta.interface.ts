export interface Cuota {
  id_cuota: number;
  uuid?: string;
  plan_pago_id: number;
  numero: number;
  fecha: string;
  monto: number;
  estado: 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'PARCIAL';
  creado_en?: string;
}

export interface VentaDto {
  id: number;
  uuid?: string;
  clienteId: number;
  asesorId: number;
  inmuebleTipo: string;
  inmuebleId: number;
  precioFinal: number;
  estado: string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
  cliente?: {
    id: number;
    fullName: string;
    ci?: string;
    email?: string;
    telefono?: string;
  };
  asesor?: {
    id: number;
    fullName: string;
    email?: string;
    telefono?: string;
  };
  lote?: {
    id: number;
    numeroLote: string;
    superficieM2: number;
    precioBase: number;
    estado: string;
    urbanizacion?: {
      id: number;
      nombre: string;
      ubicacion: string;
    };
  };
  propiedad?: {
    id: number;
    nombre: string;
    tipo: string;
    tamano: number;
    precio: number;
    ubicacion: string;
    ciudad: string;
    estado: string;
    estadoPropiedad: string;
    habitaciones?: number;
    banos?: number;
    descripcion?: string;
    urbanizacion?: {  // ← AÑADE ESTO
      id: number;
      nombre: string;
      ubicacion: string;
    };
  };
  planPago?: PlanPagoDto;
  archivos?: any;
  ingresos?: any[];
  cajaId?: number;
  caja?: {
    id: number;
    nombre: string;
    saldoActual: number;
  };
}

export interface CreateVentaDto {
  clienteId: string;
  inmuebleTipo: string;
  inmuebleId: string;
  precioFinal: number;
  cajaId: string;
  estado?: string;
  observaciones?: string;
  plan_pago: {
    monto_inicial: number;
    plazo: number;
    periodicidad: string;
    fecha_inicio: string;
  };
}

export interface UpdateVentaDto {
  clienteId?: number;
  asesorId?: number; // ← nuevo: reasignación de asesor, solo ADMINISTRADOR (el backend valida el rol)
  precioFinal?: number;
  estado?: string;
  observaciones?: string;
}

export interface RegistrarPagoDto {
  plan_pago_id: number;
  monto: number;
  fecha_pago?: string;
  observacion?: string;
  metodoPago?: string;
}

// export interface PagoPlanPago {
//   id_pago_plan: number;
//   plan_pago_id: number;
//   monto: number;
//   fecha_pago: string;
//   observacion?: string;
//   metodoPago?: string;
//   creado_en?: string;
// }

export type ModalidadPago =
  | 'UNICO'
  | 'DIARIO'
  | 'SEMANAL'
  | 'QUINCENAL'
  | 'MENSUAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL';

export type TipoCuotaEnum = 'INICIAL' | 'PRINCIPAL' | 'ADICIONAL';
export type EstadoPlanPagoEnum = 'ACTIVO' | 'PAGADO' | 'MOROSO' | 'CANCELADO';
export type EstadoCuotaEnum = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'PARCIAL';

export interface Cuota {
  id_cuota: number;
  uuid?: string;
  plan_pago_id: number;
  tipo: TipoCuotaEnum;
  numero: number;
  fecha: string;
  monto: number;
  estado: EstadoCuotaEnum;
  creado_en?: string;
}

export interface PagoPlanPago {
  id_pago_plan: number;
  uuid?: string;
  plan_pago_id: number;
  monto: number;
  fecha_pago: string;
  observacion?: string | null;
  metodoPago?: string | null;
  creado_en?: string;
    voucherUrl?: string | null;
}

export interface PlanPagoDto {
  id_plan_pago: number;
  uuid?: string;
  ventaId: number;
  total: number;

  // --- Bloque Inicial ---
  montoInicial: number;
  inicialFraccionado: boolean;
  modalidadInicial?: ModalidadPago | null;
  cantidadPagosInicial?: number | null;
  fechaInicioInicial?: string | null;

  // --- Bloque Principal ---
  modalidadPrincipal: ModalidadPago;
  numeroCuotas: number;
  fechaPrimeraCuota: string;

  // --- Bloque Adicional ---
  tieneAdicional: boolean;
  montoAdicional?: number | null;
  modalidadAdicional?: ModalidadPago | null;
  cantidadPagosAdicional?: number | null;
  fechaInicioAdicional?: string | null;

  fechaVencimiento?: string | null;
  estado: EstadoPlanPagoEnum;
  creado_en?: string;
  actualizado_en?: string;

  // Relaciones
  pagos?: PagoPlanPago[];
  cuotas?: Cuota[];

  // --- Campos calculados por agregarCalculosVenta() en el backend ---
  saldo_pendiente?: number;
  total_pagado?: number;
  porcentaje_pagado?: number;
  monto_cuota_principal?: number;
  cantidad_cuotas_principal?: number;
  monto_cuota_inicial?: number;
  monto_cuota_adicional?: number;
  dias_restantes?: number | null;
}