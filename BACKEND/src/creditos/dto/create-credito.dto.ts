export class CreateCreditoDto {}
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago } from '../../../generated/prisma'; // ajusta el path

export class ListarCreditosDto {
  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  urbanizacion?: string;
    @IsOptional()
  urbanizacionId?: number; 
  @IsOptional()
  @IsString()
  search?: string;


  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;
}

export class RegistrarPagoDto {
  @IsNumber()
  @IsPositive()
  monto?: number;

  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsInt()
  cajaId?: number;
}