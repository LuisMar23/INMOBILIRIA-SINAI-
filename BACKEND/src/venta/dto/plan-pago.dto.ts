import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsPositive,
  IsBoolean,
  IsDate,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

// Reemplaza a PeriodicidadPago (DIAS/SEMANAS/MESES) — ahora cubre todas las
// modalidades que aparecen en la UI (Bimestral, Anual, etc.)
export enum ModalidadPago {
  UNICO = 'UNICO',
  DIARIO = 'DIARIO',
  SEMANAL = 'SEMANAL',
  QUINCENAL = 'QUINCENAL',
  MENSUAL = 'MENSUAL',
  BIMESTRAL = 'BIMESTRAL',
  TRIMESTRAL = 'TRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL',
}

export enum TipoCuota {
  INICIAL = 'INICIAL',
  PRINCIPAL = 'PRINCIPAL',
  ADICIONAL = 'ADICIONAL',
}

export enum EstadoPlanPago {
  ACTIVO = 'ACTIVO',
  PAGADO = 'PAGADO',
  MOROSO = 'MOROSO',
  CANCELADO = 'CANCELADO',
}

// --- Bloque 1: Inicial ---
// Corresponde al tab "Financiación > Inicial" del formulario.
// El toggle "Crear un Plan de Pagos del Inicial" = fraccionado.
export class PlanInicialDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  montoInicial: number;

  @IsOptional()
  @IsBoolean()
  fraccionado?: boolean = false;

  // Estos 3 campos solo son obligatorios si fraccionado = true
  @ValidateIf((o) => o.fraccionado === true)
  @IsEnum(ModalidadPago)
  modalidad?: ModalidadPago;

  @ValidateIf((o) => o.fraccionado === true)
  @IsInt()
  @Min(1)
  cantidadPagos?: number;

  @ValidateIf((o) => o.fraccionado === true)
  @IsDate()
  @Type(() => Date)
  fechaInicio?: Date;
}

// --- Bloque 2: Principal ---
// Corresponde al tab "Financiación > Principal". Siempre obligatorio
// cuando el tipo de venta es CRÉDITO.
export class PlanPrincipalDto {
  @IsEnum(ModalidadPago)
  modalidad: ModalidadPago;

  @ValidateIf((o) => o.modalidad !== ModalidadPago.UNICO)
  @IsInt()
  @Min(1)
  numeroCuotas: number;
  @IsDate()
  @Type(() => Date)
  fechaPrimeraCuota: Date;
}

// --- Bloque 3: Adicional (opcional) ---
// Corresponde al tab "Financiación > Adicional". Solo se valida si
// el toggle "Añadir un Plan de Pagos Adicional" está activo.
export class PlanAdicionalDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean = false;

  @ValidateIf((o) => o.activo === true)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  montoAdicional?: number;

  @ValidateIf((o) => o.activo === true)
  @IsEnum(ModalidadPago)
  modalidad?: ModalidadPago;

  @ValidateIf((o) => o.activo === true)
  @IsInt()
  @Min(1)
  cantidadPagos?: number;

  @ValidateIf((o) => o.activo === true)
  @IsDate()
  @Type(() => Date)
  fechaInicio?: Date;
}

// --- DTO combinado que reemplaza al CreatePlanPagoDto plano ---
export class CreatePlanPagoDto {
  @ValidateNested()
  @Type(() => PlanInicialDto)
  inicial: PlanInicialDto;

  @ValidateNested()
  @Type(() => PlanPrincipalDto)
  principal: PlanPrincipalDto;

  // Adicional es opcional a nivel de venta: si no viene, no se genera
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanAdicionalDto)
  adicional?: PlanAdicionalDto;
}

// --- Update: permite editar cualquiera de los 3 bloques parcialmente ---
export class UpdatePlanInicialDto extends PlanInicialDto {}
export class UpdatePlanPrincipalDto extends PlanPrincipalDto {}
export class UpdatePlanAdicionalDto extends PlanAdicionalDto {}

export class UpdatePlanPagoDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePlanInicialDto)
  inicial?: UpdatePlanInicialDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePlanPrincipalDto)
  principal?: UpdatePlanPrincipalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePlanAdicionalDto)
  adicional?: UpdatePlanAdicionalDto;
}