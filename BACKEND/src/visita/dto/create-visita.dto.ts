import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoVisita {
  PENDIENTE = 'PENDIENTE',
  REALIZADA = 'REALIZADA',
  CANCELADA = 'CANCELADA',
}

export enum TipoInmueble {
  LOTE = 'LOTE',
  PROPIEDAD = 'PROPIEDAD',
}

export class CreateVisitaDto {
  @IsInt()
  @Min(1)
  clienteId: number;

  @IsEnum(TipoInmueble)
  inmuebleTipo: TipoInmueble;

  @IsInt()
  @Min(1)
  inmuebleId: number;

  @IsDate()
  @Type(() => Date)
  fechaVisita: Date;

  @IsOptional()
  @IsEnum(EstadoVisita)
  estado?: EstadoVisita;

  @IsOptional()
  @IsString()
  comentarios?: string;
}

export class UpdateVisitaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  clienteId?: number;

  @IsOptional()
  @IsEnum(TipoInmueble)
  inmuebleTipo?: TipoInmueble;

  @IsOptional()
  @IsInt()
  @Min(1)
  inmuebleId?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fechaVisita?: Date;

  @IsOptional()
  @IsEnum(EstadoVisita)
  estado?: EstadoVisita;

  @IsOptional()
  @IsString()
  comentarios?: string;
}