import { IsEnum, IsOptional } from 'class-validator';
import { FiltroFechaDto } from './Filtro fecha.dto';
import { TipoOperacion } from 'generated/prisma';

export class RecibosEmitidosDto extends FiltroFechaDto {
  @IsOptional()
  @IsEnum(TipoOperacion)
  tipoOperacion?: TipoOperacion; // VENTA | RESERVA
}