import {
  IsNumber,
  IsOptional,
  IsString,
  IsDate,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
}

// Actualiza UN pago puntual ya registrado (PagoPlanPago), no el plan de
// pago completo. Ver UpdatePlanPagoDto en plan-pago.dto.ts para eso.
export class UpdatePagoPlanDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  monto?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fecha_pago?: Date;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;
}