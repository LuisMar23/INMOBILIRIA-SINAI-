import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { AuthGuard } from '@nestjs/passport';
import { MovimientosService } from './movimiento.service';

@Controller('movimientos')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Post()
  create(@Body() dto: CreateMovimientoDto, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.movimientosService.create({ ...dto, usuarioId, ip, userAgent });
  }

  // 👈 Eliminado findByCaja, ahora todo va por filtrado
  @Get('caja/:cajaId')
  findByCaja(
    @Param('cajaId') cajaId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
    @Query('tipo') tipo?: string,
    @Query('metodoPago') metodoPago?: string,
    @Query('manzano') manzano?: string,
    @Query('numeroLote') numeroLote?: string,
  ) {
    return this.movimientosService.findByCajaFiltrado(
      Number(cajaId),
      Number(page ?? 1),
      Number(pageSize ?? 10),
      {
        mes: mes ? Number(mes) : undefined,
        anio: anio ? Number(anio) : undefined,
        tipo: tipo as 'INGRESO' | 'EGRESO' | undefined,
        metodoPago: metodoPago || undefined,
        manzano: manzano || undefined,
        numeroLote: numeroLote || undefined,
      },
    );
  }

  @Get('caja/:cajaId/totales')
  getTotalesPorMetodo(@Param('cajaId') cajaId: string) {
    return this.movimientosService.getTotalesPorMetodo(+cajaId);
  }

  @Get('caja/:cajaId/resumen')
  getResumenCaja(@Param('cajaId') cajaId: string) {
    return this.movimientosService.getResumenCaja(+cajaId);
  }

  @Get('caja/:cajaId/filtrado')
  findByCajaFiltrado(
    @Param('cajaId') cajaId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
    @Query('tipo') tipo?: string,
    @Query('metodoPago') metodoPago?: string,
    @Query('manzano') manzano?: string,
    @Query('numeroLote') numeroLote?: string,
  ) {
    return this.movimientosService.findByCajaFiltrado(
      Number(cajaId),
      Number(page ?? 1),
      Number(pageSize ?? 10),
      {
        mes: mes ? Number(mes) : undefined,
        anio: anio ? Number(anio) : undefined,
        tipo: tipo as 'INGRESO' | 'EGRESO' | undefined,
        metodoPago: metodoPago || undefined,
        manzano: manzano || undefined,
        numeroLote: numeroLote || undefined,
      },
    );
  }
}
