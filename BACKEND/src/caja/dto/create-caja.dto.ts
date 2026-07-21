import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum EstadoCaja {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

export enum TipoMovimiento {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
}

export enum TipoCierre {
  PARCIAL = 'PARCIAL',
  TOTAL = 'TOTAL',
}

export class CreateCajaDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsNumber()
  montoInicial: number;

  @IsNotEmpty()
  @IsNumber()
  usuarioAperturaId: number;
}

export class AbrirCajaDto {
  @IsNotEmpty()
  @IsNumber()
  montoInicial: number;
}