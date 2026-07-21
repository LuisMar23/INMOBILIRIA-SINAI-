import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { FiltroFechaDto } from './Filtro fecha.dto';


/**
 * Filtros para "Reporte de Gastos".
 * A diferencia de Ingreso, el modelo Egreso sí tiene cajaId y metodoPago
 * directamente, así que acá todos los filtros del panel aplican.
 */
export class ReporteGastosDto extends FiltroFechaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoriaId?: number; // "Concepto de Gasto"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cajaId?: number; // "Banco / Caja Origen"

  @IsOptional()
  @IsString()
  metodoPago?: string; // Egreso.metodoPago es String, no enum MetodoPago
}