export interface UrbanizacionDto {
  id?: number;
  uuid?: string | undefined;
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  maps?: string;
  createdAt?: Date;
  updatedAt?: Date;
  archivos?: any;
  _count?: { lotes: number };
  sedeId?: number;
  sede?: { id: number; nombre: string };
  superficieTotal?: number;
  estado?: string;
  colindanciaNorte?: string;
  colindanciaEste?: string;
  colindanciaSur?: string;
  colindanciaOeste?: string;
}

export interface CreateUrbanizacionDto {
  nombre: string;
  ubicacion: string;
  ciudad: string;
  descripcion?: string;
  maps?: string;
  sedeId?: number;
  superficieTotal?: number;
  estado?: string;
  colindanciaNorte?: string;
  colindanciaEste?: string;
  colindanciaSur?: string;
  colindanciaOeste?: string;
}

export interface UpdateUrbanizacionDto {
  nombre?: string;
  ubicacion?: string;
  ciudad?: string;
  descripcion?: string;
  maps?: string;
  sedeId?: number;
  superficieTotal?: number;
  estado?: string;
  colindanciaNorte?: string;
  colindanciaEste?: string;
  colindanciaSur?: string;
  colindanciaOeste?: string;
}

export interface CiudadGroup {
  ciudad: string;
  urbanizaciones: UrbanizacionDto[];
}
