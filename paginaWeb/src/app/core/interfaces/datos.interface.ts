export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
}

export enum TipoPropiedad {
  CASA = 'CASA',
  DEPARTAMENTO = 'DEPARTAMENTO',
  GARZONIER = 'GARZONIER',
  CUARTO = 'CUARTO',
}

export enum EstadoPropiedad {
  VENTA = 'VENTA',
  ALQUILER = 'ALQUILER',
  ANTICREDITO = 'ANTICREDITO',
}

export interface Urbanizacion {
  id: number;
  uuid: string;
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  maps?: string;
  archivos?: any;
  createdAt: Date;
  updatedAt: Date;
  lotes?: any;
  _count?: {
    lotes: number;
  };
}

export interface Promocion {
  id: number;
  uuid: string;
  titulo: string;
  descripcion?: string;
  descuento: number;
  fechaInicio: Date;
  fechaFin: Date;
  urbanizacionId?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LotePromocion {
  id: number;
  uuid: string;
  loteId: number;
  promocionId: number;
  precioOriginal: number;
  precioConDescuento: number;
  promocion?: Promocion;
}

export interface Archivo {
  id: number;
  uuid: string;
  url: string;
  tipo: string;
  nombre: string;
}

export interface Lote {
  id: number;
  uuid: string;
  urbanizacionId?: number;
  numeroLote: string;
  superficieM2: number;
  precioBase: number;
  precioM2?: number;
  partida?: string;
  colindaFrontal?: string;
  colindaDerecho?: string;
  colindaIzquierdo?: string;
  colindaFondo?: string;
  descripcion?: string;
  ubicacion?: string;
  ciudad: string;
  manzano?: string;
  medidaFrente?: number;
  medidaIzquierda?: number;
  medidaDerecha?: number;
  medidaFondo?: number;
  esIndependiente: boolean;
  estado: EstadoInmueble;
  createdAt: Date;
  updatedAt: Date;
  urbanizacion?: Urbanizacion;
  archivos?: any;
  LotePromocion?: LotePromocion[];
  encargado?: any;
}

export interface Propiedad {
  id: number;
  uuid: string;
  tipo: TipoPropiedad;
  tipoInmueble: string;
  nombre: string;
  tamano: number;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  habitaciones?: number;
  banos?: number;
  precio: number;
  estado: EstadoInmueble;
  estadoPropiedad: EstadoPropiedad;
  latitud?: number;
  longitud?: number;
  createdAt: Date;
  updatedAt: Date;
  archivos?: Archivo[];
  ventas?: any[];
  visitas?: any[];
  _count?: {
    ventas: number;
    visitas: number;
    archivos: number;
  };
}

export interface FiltrosLote {
  ciudad: string;
  precioMin: number;
  precioMax: number;
  superficieMin: number;
  superficieMax: number;
  urbanizacionId?: number;
  estado: EstadoInmueble | '';
  busqueda: string;
}

export interface FiltrosPropiedad {
  ciudad: string;
  precioMin: number;
  precioMax: number;
  tamanoMin: number;
  tamanoMax: number;
  tipoPropiedad?: TipoPropiedad | '';
  estadoPropiedad?: EstadoPropiedad | '';
  estado: EstadoInmueble | '';
  busqueda: string;
}

export type VistaLote = 'grid' | 'list' | 'map';
export type VistaPropiedad = 'grid' | 'list' | 'map';
