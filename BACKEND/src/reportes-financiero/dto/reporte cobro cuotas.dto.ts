import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { FiltroFechaDto } from './Filtro fecha.dto';
import { MetodoPago, TipoCuota } from 'generated/prisma';


/**
 * Filtros para "Reporte Cobro Cuotas" — este ES el reporte real de ingresos
 * por ventas de lotes/propiedades, basado en PagoPlanPago (cada pago
 * efectivamente cobrado). Cubre los 3 filtros de la UI relacionados a
 * ventas: Forma de Pago, Banco/Caja, Tipo de Cuota.
 */
export class ReporteCobroCuotasDto extends FiltroFechaDto {
  @IsOptional()
  @IsEnum(TipoCuota)
  tipoCuota?: TipoCuota; // INICIAL | PRINCIPAL | ADICIONAL

  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago; // "Forma Pago" — PagoPlanPago.metodoPago sí es el enum MetodoPago

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cajaId?: number; // "Banco / Caja Interna" — se filtra vía planPago.venta.cajaId
}