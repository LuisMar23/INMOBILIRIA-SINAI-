import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('resumen')
  getResumen() {
    return this.dashboardService.getResumenGeneral();
  }

  @Get('actividad')
  getActividad() {
    return this.dashboardService.getActividadMensual();
  }
}
