import { IsOptional, IsInt, IsString } from "class-validator";

export class CreateArchivoDto {
  @IsOptional()
  @IsInt()
  ventaId?: number;

  @IsOptional()
  @IsInt()
  reservaId?: number;

  @IsOptional()
  @IsInt()
  loteId?: number;

  @IsOptional()
  @IsInt()
  urbanizacionId?: number;

  @IsOptional()
  @IsInt()
  propiedadId?: number; 

  @IsString()
  urlArchivo: string;

  @IsOptional()
  @IsString()
  tipoArchivo?: string;

  @IsOptional()
  @IsString()
  nombreArchivo?: string;
}