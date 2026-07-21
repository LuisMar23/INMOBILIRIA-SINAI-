// import {  IsInt, IsDateString, IsOptional, IsString } from 'class-validator';

// import { Type } from 'class-transformer';
// import { IsEnum, } from 'class-validator';
// import { TipoCuota, TipoOperacion } from 'generated/prisma';





// // Ajusta esta ruta al output real de tu schema.prisma (generator client -> output = "../generated/prisma")

// // Ajusta esta ruta al output real de tu schema.prisma (generator client -> output = "../generated/prisma")


// /**
//  * Filtro base de rango de fechas, usado por todos los reportes.
//  * Corresponde al toggle "Filtrar por Fechas" + "Fecha de Inicio" / "Fecha de Fin" del panel de filtros.
//  */
// export class FiltroFechaDto {
//   @IsOptional()
//   @IsDateString()
//   fechaInicio?: string;

//   @IsOptional()
//   @IsDateString()
//   fechaFin?: string;
// }


// /**
//  * Filtros para "Reporte de Ingresos".
//  *
//  * NOTA: el modelo Ingreso no tiene cajaId ni metodoPago propios, así que no
//  * hay filtro directo de "Banco/Caja Interna" ni "Forma Pago" aquí. El service
//  * deriva la caja a través de `ingreso.venta.caja` cuando existe una venta asociada.
//  */
// export class ReporteIngresosDto extends FiltroFechaDto {
//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   categoriaId?: number; // "Concepto de Ingreso"

//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   ventaId?: number;
// }

// export class RecibosEmitidosDto extends FiltroFechaDto {
//   @IsOptional()
//   @IsEnum(TipoOperacion)
//   tipoOperacion?: TipoOperacion; // VENTA | RESERVA
// }



// /** Corresponde al filtro "Tipo Cuota" (INICIAL | PRINCIPAL | ADICIONAL) del panel */
// export class ReporteCobroCuotasDto extends FiltroFechaDto {
//   @IsOptional()
//   @IsEnum(TipoCuota)
//   tipoCuota?: TipoCuota;
// }



// /**
//  * Filtros para "Reporte de Gastos".
//  * A diferencia de Ingreso, el modelo Egreso sí tiene cajaId y metodoPago
//  * directamente, así que acá todos los filtros del panel aplican.
//  */
// export class ReporteGastosDto extends FiltroFechaDto {
//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   categoriaId?: number; // "Concepto de Gasto"

//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   cajaId?: number; // "Banco / Caja Origen"

//   @IsOptional()
//   @IsString()
//   metodoPago?: string; // Egreso.metodoPago es String, no enum MetodoPago
// }