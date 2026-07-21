import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoPropiedad {
  CASA = 'CASA',
  DEPARTAMENTO = 'DEPARTAMENTO',
  GARZONIER = 'GARZONIER',
  CUARTO = 'CUARTO',
}

export enum EstadoPropiedad {
  VENTA = 'VENTA',
  ALQUILER = 'ALQUILER',
  ANTICREDITO = 'ANTICREDITO',
}

export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
  CON_OFERTA = 'CON_OFERTA',
}

export enum TipoInmueble {
  LOTE = 'LOTE',
  PROPIEDAD = 'PROPIEDAD',
}

export class CreatePropiedadDto {
  @IsEnum(TipoPropiedad)
  tipo: TipoPropiedad;

  @IsString()
  nombre: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  tamano: number;

  @IsString()
  ubicacion: string;

  @IsString()
  ciudad: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  habitaciones?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  banos?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  precio: number;

  @IsOptional()
  @IsEnum(EstadoInmueble)
  estado?: EstadoInmueble;

  @IsOptional()
  @IsEnum(EstadoPropiedad)
  estadoPropiedad?: EstadoPropiedad;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  usuarioId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  encargadoId?: number;
}