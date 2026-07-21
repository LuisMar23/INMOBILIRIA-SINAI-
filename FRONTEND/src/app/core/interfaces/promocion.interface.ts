export interface PromocionDto {
  id: number;
  uuid: string;
  titulo: string;
  descripcion?: string;
  descuento: number;
  fechaInicio: string;
  fechaFin: string;
  urbanizacionId?: number;
  isActive: boolean;
  aplicadaATodos?: boolean;
  createdAt: string;
  updatedAt: string;
  urbanizacion?: {
    id: number;
    nombre: string;
  };
  lotesAfectados?: Array<{
    id: number;
    loteId: number;
    promocionId: number;
    precioOriginal: number;
    precioConDescuento: number;
    lote: {
      id: number;
      numeroLote: string;
      precioBase: number;
      estado: string;
      urbanizacion: {
        nombre: string;
      };
    };
  }>;
  _count?: {
    lotesAfectados: number;
  };
}
