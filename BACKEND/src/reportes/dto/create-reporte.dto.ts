import { IsOptional, IsString, IsEnum, IsNumberString, IsDateString, IsBoolean, IsInt } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TipoInmueble } from '../../../generated/prisma';

export class FiltrosReporteDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  /** @deprecated usar manzanoId — se mantiene por compatibilidad si algo aún lo usa */
  @IsOptional()
  @IsString()
  manzano?: string;

  /** ID numérico de la manzana (reemplaza al filtro por nombre string) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  manzanoId?: number;

  @IsOptional()
  @IsEnum({ ...TipoInmueble, TODOS: 'TODOS' })
  tipoVenta?: TipoInmueble | 'TODOS';

  @IsOptional()
  @IsNumberString()
  asesorId?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  /** ID de la urbanización activa (alcance "por urbanización") */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  urbanizacionId?: number;

  /** true = ignora urbanizacionId y trae todos los datos (solo ADMINISTRADOR) */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  global?: boolean;
}

export class FiltrosClienteDto {
  @IsNumberString()
  clienteId: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}