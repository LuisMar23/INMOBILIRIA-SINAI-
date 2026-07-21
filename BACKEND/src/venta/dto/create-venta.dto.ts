import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  ValidateNested,
  IsPositive,
  ValidateIf,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePlanPagoDto } from './plan-pago.dto';

export enum EstadoInmueble {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  VENDIDO = 'VENDIDO',
  CON_OFERTA = 'CON_OFERTA',
}

export enum TipoInmueble {
  LOTE = 'LOTE',
  PROPIEDAD = 'PROPIEDAD',
}

export enum EstadoVenta {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  CANCELADO = 'CANCELADO',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
}

export class ClienteNuevoDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  ci: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}

// Datos del comprobante de pago (Imagen 4). El archivo del voucher en sí
// NO va aquí — llega aparte como multipart/form-data y se maneja en el
// controller con FileInterceptor.
export class PagoDto {
  @IsOptional()
  @IsString()
  bancoDestino?: string;

  @ValidateIf((o) => !o.ventaSinPagoInmediato)
  @IsString()
  @IsNotEmpty()
  comprobante?: string;

  @ValidateIf((o) => !o.ventaSinPagoInmediato)
  @IsString()
  @IsNotEmpty()
  numeroComprobante?: string;

  @ValidateIf((o) => !o.ventaSinPagoInmediato)
  @IsString()
  @IsNotEmpty()
  formaPago?: string;

  @IsOptional()
  @IsBoolean()
  ventaSinPagoInmediato?: boolean;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  montoTotalVenta: number;

  @ValidateIf((o) => !o.ventaSinPagoInmediato)
  @IsDateString()
  fechaHoraPago?: string;

  @IsOptional()
  @IsString()
  codigoOperacion?: string;

  @IsOptional()
  @IsString()
  observacionPago?: string;
}

export class CreateVentaDto {
  @ValidateIf((o) => !o.clienteNuevo)
  @IsInt()
  @IsPositive()
  clienteId?: number;

  @ValidateIf((o) => !o.clienteId)
  @ValidateNested()
  @Type(() => ClienteNuevoDto)
  clienteNuevo?: ClienteNuevoDto;

  @IsEnum(TipoInmueble)
  inmuebleTipo: TipoInmueble;

  @IsInt()
  @IsPositive()
  inmuebleId: number;

  // Precio final acordado para ESTA venta (puede diferir del precioBase del lote,
  // ej: recargo por financiamiento o descuento por pago al contado)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  precioFinal: number;

  // Snapshot opcional del precioBase del lote al momento de la venta,
  // para poder calcular después "recargo por financiamiento" en reportes
  // sin depender de que el precioBase del lote no haya cambiado
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precioListaLote?: number;

  @IsOptional()
  @IsEnum(EstadoVenta)
  estado?: EstadoVenta;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsInt()
  @IsPositive()
  cajaId: number;
@IsOptional()
@IsInt()
asesorId?: number;
  // Solo obligatorio si la venta es a CRÉDITO; si es CONTADO, el service
  // no debería exigir este campo (validar con un DTO discriminado o
  // condicional a nivel de service, según tu enum TipoVenta)
  @ValidateNested()
  @Type(() => CreatePlanPagoDto)
  plan_pago: CreatePlanPagoDto;

  // Datos del comprobante del pago inmediato (banco, N° comprobante, forma
  // de pago, etc). El archivo del voucher llega aparte, ver PagoDto arriba.
  @IsOptional()
  @ValidateNested()
  @Type(() => PagoDto)
  pago?: PagoDto;
}

export class RegistrarPagoDto {
  @IsInt()
  @IsPositive()
  plan_pago_id: number;

  // A qué cuota(s) se está aplicando este pago — importante ahora que
  // hay 3 tipos de cuota (INICIAL/PRINCIPAL/ADICIONAL) mezcladas en un
  // mismo plan
  @IsOptional()
  @IsInt()
  @IsPositive()
  cuota_id?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  monto: number;

  @IsOptional()
  @Type(() => Date)
  fecha_pago?: Date;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;
}