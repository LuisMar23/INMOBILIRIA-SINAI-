import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { TipoMovimiento } from '../../caja/dto/create-caja.dto';
import { MetodoPago } from 'generated/prisma';

export class CreateMovimientoDto {
  @IsNotEmpty()
  @IsNumber()
  cajaId: number;

  @IsNotEmpty()
  @IsNumber()
  usuarioId: number;

  @IsNotEmpty()
  @IsEnum(TipoMovimiento)
  tipo: TipoMovimiento;

  @IsNotEmpty()
  @IsNumber()
  monto: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;

  @IsOptional()
  @IsString()
  referencia?: string;

    @IsOptional()
  @IsNumber()
  ventaId?: number;
}
