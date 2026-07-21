export interface LoteDto {
  id: number;
  uuid: string;
  urbanizacionId?: number;
  numeroLote: string;
  superficieM2: number;
  precioBase: number;
  precioActual?: number;
  tienePromocionActiva?: boolean;
  promocionActiva?: {
    id: number;
    titulo: string;
    descuento: number;
    fechaFin: string;
  };
  descripcion?: string;
  ubicacion?: string;
  ciudad: string;
  manzanoId?: number;
  manzano?: { id: number; nombre: string };
  latitud?: number;
  longitud?: number;
  esIndependiente: boolean;
  estado: string;
  createdAt: string;
  updatedAt: string;
  encargadoId?: number;
  encargado?: {
    id: number;
    fullName: string;
    telefono: string;
  };
  archivos?: any;
  urbanizacion?: {
    id: number;
    uuid: string;
    nombre: string;
    ubicacion: string;
    ciudad: string;
  };
  LotePromocion?: Array<{
    id: number;
    promocion: {
      id: number;
      titulo: string;
      descuento: number;
      fechaInicio: string;
      fechaFin: string;
    };
  }>;
  _count?: {
    cotizaciones: number;
    ventas: number;
    reservas: number;
    visitas: number;
    archivos: number;
  };
}
export interface CreateLoteDto {
  urbanizacionId?: number;
  numeroLote: string;
  superficieM2: number;
  precioBase: number;
  precioM2?: number;
  descripcion?: string;
  ubicacion?: string;
  ciudad: string;
  medidaFrente?: number;
  medidaIzquierda?: number;
  medidaDerecha?: number;
  medidaFondo?: number;
  partida?: string;
  colindaFrontal?: string;
  colindaDerecho?: string;
  colindaIzquierdo?: string;
  colindaFondo?: string;
  esIndependiente: boolean;
  estado: string;
  encargadoId?: number;
  manzanoId?: number;
}

export interface UpdateLoteDto {
  urbanizacionId?: number;
  numeroLote?: string;
  superficieM2?: number;
  precioBase?: number;
  precioM2?: number;
  descripcion?: string;
  ubicacion?: string;
  ciudad?: string;
  medidaFrente?: number;
  medidaIzquierda?: number;
  medidaDerecha?: number;
  medidaFondo?: number;
  partida?: string;
  colindaFrontal?: string;
  colindaDerecho?: string;
  colindaIzquierdo?: string;
  colindaFondo?: string;
  esIndependiente?: boolean;
  estado?: string;
  encargadoId?: number;
  manzanoId?: number;
}

export interface LoteGroup {
  key: string;
  nombre: string;
  ciudad: string;
  independiente: boolean;
  colorIndex: number;
  lotes: LoteDto[];
}

export interface UrbanizacionGroup {
  urbanizacion: string;
  uuid?: string;
  ciudad?: string;
  ubicacion?: string;
  independiente: boolean;
  lotes: LoteDto[];
}
