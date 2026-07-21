export interface PropiedadDto {
  id: number;
  uuid: string;
  tipo: string;
  tipoInmueble: string;
  nombre: string;
  tamano: number;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  habitaciones?: number;
  banos?: number;
  precio: number;
  estado: string;
  estadoPropiedad: string;
  encargadoId?: number;
    urbanizacionId?: number;  
      urbanizacion?: {                 // ← agregar
    id: number;
    uuid: string;
    nombre: string;
    ciudad: string;
    ubicacion: string;
  };
  encargado?: {
    id: number;
    fullName: string;
    telefono: string;
  };
  createdAt: string;
  updatedAt: string;
  archivos?: any[];
  ventas?: any[];
  visitas?: any[];
  _count?: {
    ventas: number;
    visitas: number;
    archivos: number;
  };
}

export interface CreatePropiedadDto {
  tipo: string;
  nombre: string;
  tamano: number;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  habitaciones?: number;
  banos?: number;
  precio: number;
  estado?: string;
  estadoPropiedad?: string;
  usuarioId?: number;
  encargadoId?: number;
}

export interface UpdatePropiedadDto {
  tipo?: string;
  nombre?: string;
  tamano?: number;
  ubicacion?: string;
  ciudad?: string;
  descripcion?: string;
  habitaciones?: number;
  banos?: number;
  precio?: number;
  estado?: string;
  estadoPropiedad?: string;
  usuarioId?: number;
  encargadoId?: number;
}