import {
  IsInt,
  Min,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';

export enum EstadoReserva {
  ACTIVA = 'ACTIVA',
  VENCIDA = 'VENCIDA',
  CANCELADA = 'CANCELADA',
  CONVERTIDA_EN_VENTA = 'CONVERTIDA_EN_VENTA',
}

export enum TipoInmueble {
  LOTE = 'LOTE',
  PROPIEDAD = 'PROPIEDAD',
}

export class CreateReservaDto {
  @IsInt()
  @Min(1)
  clienteId: number;

  @IsEnum(TipoInmueble)
  inmuebleTipo: TipoInmueble;

  @IsInt()
  @Min(1)
  inmuebleId: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaVencimiento: string;

  @IsOptional()
  @IsEnum(EstadoReserva)
  estado?: EstadoReserva;
}