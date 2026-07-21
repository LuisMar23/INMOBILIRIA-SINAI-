import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CreditosService } from './creditos.service';
import { ListarCreditosDto, RegistrarPagoDto } from './dto/create-credito.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // descomenta si usas guards
// import { Roles } from '../auth/decorators/roles.decorator';
// import { UserRole } from '../../../generated/prisma';

@Controller('creditos')
// @UseGuards(JwtAuthGuard)
export class CreditosController {
  constructor(private readonly creditosService: CreditosService) {}

  /**
   * GET /creditos
   * Lista todos los créditos (ventas con plan de pago)
   * Query params: ciudad, urbanizacion, search, page, limit
   */
  @Get()
  listarCreditos(@Query() query: ListarCreditosDto) {
    return this.creditosService.listarCreditos(query);
  }

  /**
   * GET /creditos/:ventaId/cronograma
   * Devuelve el cronograma de cuotas del plan de pago (botón "Crong")
   */
  @Get(':ventaId/cronograma')
  getCronograma(@Param('ventaId', ParseIntPipe) ventaId: number) {
    return this.creditosService.getCronograma(ventaId);
  }

  /**
   * GET /creditos/:ventaId/historial-pagos
   * Devuelve el historial de pagos realizados (botón "H.Pagos")
   */
  @Get(':ventaId/historial-pagos')
  getHistorialPagos(@Param('ventaId', ParseIntPipe) ventaId: number) {
    return this.creditosService.getHistorialPagos(ventaId);
  }

  /**
   * POST /creditos/:ventaId/registrar-pago
   * Registra un pago de cuota (botón "Reg")
   */
  @Post(':ventaId/registrar-pago')
  registrarPago(
    @Param('ventaId', ParseIntPipe) ventaId: number,
    @Body() dto: RegistrarPagoDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.id ?? 1; // reemplaza con el usuario del JWT
    return this.creditosService.registrarPago({ ventaId, usuarioId, ...dto });
  }
}