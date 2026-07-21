import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoVenta } from './create-venta.dto';

// Este DTO NO incluye plan_pago a propósito — ver UpdatePlanPagoDto en
// plan-pago.dto.ts, que se usa en un endpoint separado
// (ej: PATCH /ventas/:id/plan-pago). Editar el plan de pago de una venta
// ya activa (con cuotas ya generadas, algunas quizás ya pagadas) es una
// operación distinta y más sensible que editar los datos generales de
// la venta, así que conviene mantenerlas desacopladas.
export class UpdateVentaDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  clienteId?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  precioFinal?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precioListaLote?: number;

  @IsOptional()
  @IsEnum(EstadoVenta)
  estado?: EstadoVenta;

  @IsOptional()
  @IsString()
  observaciones?: string;
  @IsOptional()
@IsInt()
asesorId?: number;
}