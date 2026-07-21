import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoVisita, TipoInmueble } from './create-visita.dto';

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
