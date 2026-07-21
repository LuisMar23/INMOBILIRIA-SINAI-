import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { FiltrosClienteDto, FiltrosReporteDto } from './dto/create-reporte.dto';
import { ReportesVentasService } from './reportes.service';

@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('reportes/ventas')
export class ReportesVentasController {
  constructor(private readonly reportesVentasService: ReportesVentasService) {}

  @Get('reporte')
  getReporteVentas(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getReporteVentas(filtros);
  }

  @Get('detalle')
  getDetalleVentas(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getDetalleVentas(filtros);
  }

  @Get('por-vendedor')
  getVentasPorVendedor(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getVentasPorVendedor(filtros);
  }

  @Get('cuotas-por-cobrar')
  getCuotasPorCobrar(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getCuotasPorCobrar(filtros);
  }

  @Get('completadas')
  getVentasCompletadas(@Query() filtros: FiltrosReporteDto) {
    return this.reportesVentasService.getVentasCompletadas(filtros);
  }

  @Get('por-cliente')
  getVentasPorCliente(@Query() filtros: FiltrosClienteDto) {
    return this.reportesVentasService.getVentasPorCliente(filtros);
  }
}