import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { ReportesLotesService } from './reporteslotes.service';


@UseGuards(JwtAuthGuard)
@Controller('reportes/lotes')
export class ReportesLotesController {
  constructor(private readonly service: ReportesLotesService) {}

  @Get('manzanos')
  getManzanos(@Query('urbanizacionId') urbanizacionId?: string) {
    return this.service.getManzanos(
      urbanizacionId ? Number(urbanizacionId) : undefined,
    );
  }

  @Get()
  getTotalLotes(
    @Query('urbanizacionId') urbanizacionId?: string,
    @Query('manzanoId') manzanoId?: string,
  ) {
    return this.service.getTotalLotes(
      urbanizacionId ? Number(urbanizacionId) : undefined,
      manzanoId ? Number(manzanoId) : undefined,
    );
  }

  @Get('disponibles')
  getLotesDisponibles(
    @Query('urbanizacionId') urbanizacionId?: string,
    @Query('manzanoId') manzanoId?: string,
  ) {
    return this.service.getLotesDisponibles(
      urbanizacionId ? Number(urbanizacionId) : undefined,
      manzanoId ? Number(manzanoId) : undefined,
    );
  }

  @Get('vendidos')
  getLotesVendidos(
    @Query('urbanizacionId') urbanizacionId?: string,
    @Query('manzanoId') manzanoId?: string,
  ) {
    return this.service.getLotesVendidos(
      urbanizacionId ? Number(urbanizacionId) : undefined,
      manzanoId ? Number(manzanoId) : undefined,
    );
  }

  @Get('reservados')
  getLotesReservados(
    @Query('urbanizacionId') urbanizacionId?: string,
    @Query('manzanoId') manzanoId?: string,
  ) {
    return this.service.getLotesReservados(
      urbanizacionId ? Number(urbanizacionId) : undefined,
      manzanoId ? Number(manzanoId) : undefined,
    );
  }

  @Get('detalle')
  getDetalleLotes(
    @Query('urbanizacionId') urbanizacionId?: string,
    @Query('manzanoId') manzanoId?: string,
  ) {
    return this.service.getDetalleLotes(
      urbanizacionId ? Number(urbanizacionId) : undefined,
      manzanoId ? Number(manzanoId) : undefined,
    );
  }

  @Get('general-detallado')
  getGeneralDetallado(@Query('urbanizacionId') urbanizacionId?: string) {
    return this.service.getGeneralDetallado(
      urbanizacionId ? Number(urbanizacionId) : undefined,
    );
  }
}