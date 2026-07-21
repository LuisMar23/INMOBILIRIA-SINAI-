export interface ManzanoDto {
  id: number;
  uuid: string;
  nombre: string;
  urbanizacionId: number;
  urbanizacion?: {
    id: number;
    nombre: string;
    ciudad: string;
    ubicacion: string;
  };
  lotes?: Array<{ id: number; numeroLote: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateManzanoDto {
  nombre: string;
  urbanizacionId: number;
}

export interface UpdateManzanoDto {
  nombre?: string;
  urbanizacionId?: number;
}
