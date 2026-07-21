// dto/create-egreso.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEgresoDto {
  @IsString()
  descripcion: string;

  @IsNumber()
  @Type(() => Number)
  monto: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoriaId?: number;
  @IsNumber()
  @Type(() => Number)
  cajaId: number;


  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  urbanizacionId?: number;  

  @IsOptional()
  @IsEnum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'])
  metodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

   @IsOptional()
  @IsArray()
  vouchers?: string[];   

}

// dto/update-egreso.dto.ts
// export class UpdateEgresoDto {
//   @IsOptional()
//   @IsString()
//   descripcion?: string;

//   @IsOptional()
//   @IsNumber()
//   @Type(() => Number)
//   monto?: number;

//   @IsOptional()
//   @IsDateString()
//   fecha?: string;

//   @IsOptional()
//   @IsNumber()
//   @Type(() => Number)
//   categoriaId?: number;

//   @IsOptional()
//   @IsNumber()
//   @Type(() => Number)
//   cajaId?: number;

//   @IsOptional()
//   @IsEnum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'])
//   metodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

//   @IsOptional()
//   @IsArray()
//   @IsString({ each: true })
//   vouchers?: string[];
// }

// dto/filtros-egreso.dto.ts
export class FiltrosEgresoDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  categoriaId?: number;

  @IsOptional()
  cajaId?: number;

  @IsOptional()
  usuarioId?: number;

  @IsOptional()
  urbanizacionId?: number; // ← NUEVO (filtrar por proyecto)

  @IsOptional()
  @IsBoolean()
  sinUrbanizacion?: boolean;
}
