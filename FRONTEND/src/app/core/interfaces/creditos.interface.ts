export interface SiguienteCuota {
  fecha: string;
  monto: number;
  cuotasVencidas: number;
}

export interface CreditoRow {
  ventaId: number;
  cliente: string;
  clienteId: number;
  ci: string;
    numeroLote: string;
  nombreManzano: string;
  loteMz: string;
  siguienteCuota: SiguienteCuota | null;
  montoCuotaPendiente: number;
  montoRestante: number;
  totalVenta: number;
  planPagoId: number;
  estadoPlan: 'ACTIVO' | 'PAGADO' | 'CANCELADO';
  plazo: number;
  periodicidad: 'MESES' | 'SEMANAS' | 'DIAS';
  fechaInicioPlan: string | Date;
  montoInicial: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListarCreditosResponse {
  ok: boolean;
  data: CreditoRow[];
  pagination: PaginationMeta;
}

export interface ListarCreditosDto {
  search?: string;
  ciudad?: string;
  urbanizacion?: string;
  urbanizacionId?: number;  // ← agregar
  page?: number;
  limit?: number;
}
