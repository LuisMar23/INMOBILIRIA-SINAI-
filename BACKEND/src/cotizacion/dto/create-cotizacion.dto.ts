import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EstadoCotizacion {
  PENDIENTE = 'PENDIENTE',
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
}

export enum TipoInmueble {
  LOTE = 'LOTE',
  PROPIEDAD = 'PROPIEDAD',
}

export class CreateCotizacionDto {
  @IsString()
  nombreCliente: string;

  @IsString()
  contactoCliente: string;

  @IsOptional()
  @IsString()
  detalle?: string;

  @IsEnum(TipoInmueble)
  inmuebleTipo: TipoInmueble;

  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Type(() => Number)
  inmuebleId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  precioOfertado: number;

  @IsOptional()
  @IsEnum(EstadoCotizacion)
  estado?: EstadoCotizacion;
}