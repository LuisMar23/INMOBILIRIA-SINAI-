import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { TipoCierre } from '../../caja/dto/create-caja.dto';

export class CreateCierreDto {
  @IsNotEmpty()
  @IsNumber()
  cajaId: number;

  @IsNotEmpty()
  @IsNumber()
  usuarioId: number;

  @IsOptional()
  @IsEnum(TipoCierre)
  tipo?: TipoCierre;

  @IsNotEmpty()
  @IsNumber()
  saldoReal: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
