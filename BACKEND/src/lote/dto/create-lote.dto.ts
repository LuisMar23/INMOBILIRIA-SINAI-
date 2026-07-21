import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
  CON_OFERTA = 'CON_OFERTA',
}

export class CreateLoteDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  urbanizacionId?: number;

  @IsString()
  numeroLote: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  superficieM2: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  precioBase: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precioM2?: number;

  @IsOptional()
  @IsEnum(EstadoInmueble)
  estado?: EstadoInmueble;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsString()
  ciudad: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  medidaFrente?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  medidaIzquierda?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  medidaDerecha?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  medidaFondo?: number;

  @IsOptional()
  @IsString()
  partida?: string;

  @IsOptional()
  @IsString()
  colindaFrontal?: string;

  @IsOptional()
  @IsString()
  colindaDerecho?: string;

  @IsOptional()
  @IsString()
  colindaIzquierdo?: string;

  @IsOptional()
  @IsString()
  colindaFondo?: string;

  @IsBoolean()
  @Type(() => Boolean)
  esIndependiente: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  usuarioId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  encargadoId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  manzanoId?: number;
}
