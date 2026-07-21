import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { TipoOperacion } from 'generated/prisma';

export class CreateReciboDto {
  @IsEnum(TipoOperacion)
  tipoOperacion: TipoOperacion;

  @IsOptional()
  @IsInt()
  ventaId?: number;

  @IsOptional()
  @IsInt()
  reservaId?: number;

  @IsOptional()
  @IsInt()
  pagoPlanPagoId?: number;

  @IsString()
  urlArchivo: string;

  @IsOptional()
  @IsString()
  tipoArchivo?: string;

  @IsOptional()
  @IsString()
  nombreArchivo?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
