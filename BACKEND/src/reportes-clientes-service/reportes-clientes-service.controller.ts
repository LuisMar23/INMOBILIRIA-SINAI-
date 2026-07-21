import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { ReportesClientesService } from './reportes-clientes-service.service';


@UseGuards(JwtAuthGuard)

@Controller('reportes/clientes')
export class ReportesClientesController {
  constructor(private readonly service: ReportesClientesService) {}

  @Get()
  getListaClientes() {
    return this.service.getListaClientes();
  }

  @Get('potenciales')
  getClientesPotenciales() {
    return this.service.getClientesPotenciales();
  }
}