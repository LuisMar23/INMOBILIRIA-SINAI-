// backend: interfaces/cliente.interface.ts
export interface PagoPlan {
  id_pago_plan: number;
  monto: number;
  fecha_pago: Date;
  observacion: string | null;
}

export interface PlanPagoDetalle {
  id_plan_pago: number;
  uuid: string;
  total: number;
  monto_inicial: number;
  plazo: number;
  periodicidad: string;
  fecha_inicio: Date;
  fecha_vencimiento: Date;
  estado: string;
  creado_en: Date;
  actualizado_en: Date;
  pagos: PagoPlan[];
  // Campos calculados
  pagadoPlan?: number;
  saldoPendiente?: number;
  montoInicial?: number;
}

export interface VentaConDetalle {
  id: number;
  uuid: string;
  clienteId: number;
  asesorId: number;
  inmuebleTipo: string;
  precioFinal: number;
  estado: string;
  createdAt: Date;
  updatedAt: Date;
  observaciones: string | null;
  loteId: number | null;
  propiedadId: number | null;
  cajaId: number | null;
  asesor: {
    id: number;
    fullName: string;
    telefono: string;
  };
  lote?: {
    id: number;
    numeroLote: string;
    manzano: string | null;
    superficieM2: number;
    precioBase: number;
    ciudad: string;
    urbanizacion: {
      id: number;
      nombre: string;
    };
  };
  propiedad?: {
    id: number;
    nombre: string;
    tipo: string;
    ciudad: string;
    ubicacion: string;
    precio: number | null;
  };
  planPago?: PlanPagoDetalle;
}

export interface ClienteConDetalle {
  id: number;
  uuid: string;
  fullName: string;
  ci: string;
  telefono: string;
  direccion: string | null;
  observaciones: string | null;
  email: string | null;
  role: string;
  createdAt: Date;
  ventasComoCliente: VentaConDetalle[];
}