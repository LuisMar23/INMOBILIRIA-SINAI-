import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoUrbanizacion {
  VENTA = 'VENTA',
  PRE_VENTA = 'PRE_VENTA',
  POST_VENTA = 'POST_VENTA',
}

export class CreateUrbanizacionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  ubicacion: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  maps?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sedeId?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  superficieTotal?: number;



  @IsOptional()
  @IsString()
  colindanciaNorte?: string;

  @IsOptional()
  @IsString()
  colindanciaEste?: string;

  @IsOptional()
  @IsString()
  colindanciaSur?: string;

  @IsOptional()
  @IsString()
  colindanciaOeste?: string;
}
