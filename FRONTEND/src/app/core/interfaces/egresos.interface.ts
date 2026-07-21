// interfaces/egresos.interface.ts

export interface CategoriaContable {
  id: number;
  nombre: string;
  tipo: string;
}

export interface CajaResumen {
  id: number;
  nombre: string;
  saldoActual: number;
  estado: 'ABIERTA' | 'CERRADA';
}

export interface UsuarioResumen {
  id: number;
  fullName: string;
}

export interface Egreso {
  id: number;
  uuid: string;
  fecha: string;
  monto: number;
  descripcion: string;
  categoriaId: number;
  cajaId?: number;
  registradoPor: number;
  createdAt: string;
  updatedAt: string;
  categoria: CategoriaContable;
  usuario: UsuarioResumen;
  caja?: CajaResumen;
}

export interface ResumenEgresos {
  totalEgresos: number;
  montoTotal: number;
}

export interface EgresosResponse {
  resumen: ResumenEgresos;
  egresos: Egreso[];
}

export interface GrupoCategoria {
  categoria: CategoriaContable;
  totalEgresos: number;
  montoTotal: number;
}

export interface ReporteCategoriasResponse {
  resumen: { montoTotal: number; totalCategorias: number };
  categorias: GrupoCategoria[];
}

export interface GrupoCaja {
  caja: CajaResumen;
  totalEgresos: number;
  montoTotal: number;
}

export interface ReporteCajasResponse {
  resumen: { montoTotal: number; totalCajas: number };
  cajas: GrupoCaja[];
}

export interface FiltrosEgresoDto {
  fechaInicio?: string;
  fechaFin?: string;
  categoriaId?: number;
  cajaId?: number;
  usuarioId?: number;
}

export interface CreateEgresoDto {
  descripcion: string;
  monto: number;
  fecha?: string;
  categoriaId?: number;
  cajaId: number;
  metodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
}

export interface UpdateEgresoDto extends Partial<CreateEgresoDto> {}