import { Controller, Get, Query } from '@nestjs/common';

import { OtrosIngresosDto } from './dto/Otros Ingresos.dto';
import { FiltroFechaDto } from './dto/Filtro fecha.dto';
import { RecibosEmitidosDto } from './dto/Recibos emitidos.dto';
import { ReporteCobroCuotasDto } from './dto/reporte cobro cuotas.dto';
import { ReporteGastosDto } from './dto/Reporte gastos';
import { ReportesFinancierosService } from './reportes-financiero.service';


@Controller('reportes')
export class ReportesFinancierosController {
  constructor(private readonly service: ReportesFinancierosService) {}

  // ── Ingresos por ventas (fuente real: PagoPlanPago / MovimientoCaja) ──
  @Get('ingresos/cobro-cuotas')
  reporteCobroCuotas(@Query() filtros: ReporteCobroCuotasDto) {
    return this.service.reporteCobroCuotas(filtros);
  }

  @Get('ingresos/por-banco')
  ingresosPorBanco(@Query() filtros: FiltroFechaDto) {
    return this.service.ingresosPorBanco(filtros);
  }

  @Get('ingresos/recibos')
  recibosEmitidos(@Query() filtros: RecibosEmitidosDto) {
    return this.service.recibosEmitidos(filtros);
  }

  // ── Otros ingresos (modelo Ingreso, no ligado a ventas) ────────
  @Get('ingresos/otros')
  otrosIngresos(@Query() filtros: OtrosIngresosDto) {
    return this.service.otrosIngresos(filtros);
  }

  @Get('ingresos/otros/por-concepto')
  otrosIngresosPorConcepto(@Query() filtros: FiltroFechaDto) {
    return this.service.otrosIngresosPorConcepto(filtros);
  }

  // ── Gastos ──────────────────────────────────────────────────────
  @Get('gastos')
  reporteGastos(@Query() filtros: ReporteGastosDto) {
    return this.service.reporteGastos(filtros);
  }

  @Get('gastos/consolidado')
  consolidadoGastos(@Query() filtros: FiltroFechaDto) {
    return this.service.consolidadoGastos(filtros);
  }

  @Get('gastos/por-banco')
  gastosPorBanco(@Query() filtros: FiltroFechaDto) {
    return this.service.gastosPorBanco(filtros);
  }

  @Get('gastos/por-concepto')
  gastosPorConcepto(@Query() filtros: FiltroFechaDto) {
    return this.service.gastosPorConcepto(filtros);
  }

  // ── Datos auxiliares para los <select> del panel de filtros ────
  @Get('filtros/opciones')
  opcionesFiltros() {
    return this.service.opcionesFiltros();
  }
}