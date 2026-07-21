import { IsDateString, IsOptional } from 'class-validator';

/**
 * Filtro base de rango de fechas, usado por todos los reportes.
 * Corresponde al toggle "Filtrar por Fechas" + "Fecha de Inicio" / "Fecha de Fin" del panel de filtros.
 */
export class FiltroFechaDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}