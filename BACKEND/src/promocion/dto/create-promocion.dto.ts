import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsInt,
  IsArray,
  IsBoolean,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsDateRangeValid } from './date-range.validator';

export class CreatePromocionDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  @Type(() => Number)
  descuento: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  @Validate(IsDateRangeValid, ['fechaInicio'])
  fechaFin: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  lotesIds?: number[];

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  urbanizacionId?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  aplicarATodos?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  usuarioId?: number;
}
