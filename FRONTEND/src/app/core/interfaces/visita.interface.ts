export interface VisitaDto {
  id: number;
  uuid: string;
  clienteId: number;
  asesorId: number;
  inmuebleTipo: string;
  loteId?: number;
  propiedadId?: number;
  fechaVisita: string;
  estado: string;
  comentarios?: string;
  createdAt: string;
  updatedAt: string;
  cliente?: {
    id: number;
    fullName: string;
    email: string;
    telefono: string;
    ci: string;
    role: string;
  };
  asesor?: {
    id: number;
    fullName: string;
    email: string;
    role: string;
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
    uuid: string;
    tipo: string;
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
  };
  inmueble?: any;
}