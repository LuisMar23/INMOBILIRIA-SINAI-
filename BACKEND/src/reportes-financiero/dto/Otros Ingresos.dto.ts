import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { FiltroFechaDto } from './Filtro fecha.dto';


/**
 * Filtros para "Otros Ingresos": ingresos contables que NO vienen de un
 * pago de venta (esos van por PagoPlanPago/MovimientoCaja, ver
 * ReporteCobroCuotasDto e IngresosPorBanco). Ejemplos: alquileres,
 * comisiones, u otras entradas manuales clasificadas por CategoriaContable.
 */
export class OtrosIngresosDto extends FiltroFechaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoriaId?: number; // "Concepto de Ingreso"
}