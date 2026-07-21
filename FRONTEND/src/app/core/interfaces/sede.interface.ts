export interface SedeDto {
  id: number;
  uuid: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSedeDto {
  nombre: string;
  direccion?: string;
  telefono?: string;
}

export interface UpdateSedeDto {
  nombre?: string;
  direccion?: string;
  telefono?: string;
}
