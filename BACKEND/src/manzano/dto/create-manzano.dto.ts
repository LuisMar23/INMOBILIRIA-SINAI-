import { IsString, IsInt, IsOptional, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateManzanoDto {
  @IsString()
  nombre: string;

  @IsInt()
  @Type(() => Number)
  urbanizacionId: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  usuarioId?: number;
}