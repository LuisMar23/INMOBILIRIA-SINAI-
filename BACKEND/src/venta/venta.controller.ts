import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { CreateVentaDto, RegistrarPagoDto } from './dto/create-venta.dto';
import { UpdatePlanPagoDto, PlanInicialDto } from './dto/plan-pago.dto';
import { VentasService } from './venta.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePagoPlanDto } from './dto/pago-plan.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// Config del voucher: se guarda en disco bajo /uploads/vouchers. Ajusta
// destination si usas otro storage (S3, etc) — esto es un default local.
const voucherMulterOptions = {
  storage: diskStorage({
    destination: './uploads/vouchers',
    filename: (req, file, cb) => {
      const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
      cb(null, nombreUnico);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new BadRequestException('El voucher debe ser una imagen'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

@Controller('ventas')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  // Recibe multipart/form-data: el campo 'data' trae el JSON del
  // CreateVentaDto (como string) y 'voucher' es el archivo de imagen.
  // El ValidationPipe global no valida 'data' automáticamente porque llega
  // como string, no como objeto tipado — por eso se valida a mano abajo.
@Post()
@UseInterceptors(FileInterceptor('voucher', voucherMulterOptions))
async create(
  @UploadedFile() voucher: Express.Multer.File,
  @Body('data') dataRaw: string,
  @Request() req,
) {
  if (!dataRaw) {
    throw new BadRequestException('Falta el campo "data" con los datos de la venta');
  }
  let parsed: any;
  try {
    parsed = JSON.parse(dataRaw);
  } catch {
    throw new BadRequestException('El campo "data" no es un JSON válido');
  }

  const createVentaDto = plainToInstance(CreateVentaDto, parsed);
  const errores = await validate(createVentaDto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errores.length > 0) {
    throw new BadRequestException(errores);
  }

  const usuarioCreadorId = req.user.id;
  // 👇 Si el form mandó un asesorId explícito (dropdown), se respeta.
  // Si no vino, se asume que el que crea la venta es el asesor.
  const asesorAsignadoId = createVentaDto.asesorId ?? usuarioCreadorId;

  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  return this.ventasService.create(
    createVentaDto,
    asesorAsignadoId,
    usuarioCreadorId,
    ip,
    userAgent,
    voucher,
  );
}

  @Get()
  findAll(
    @Request() req,
    @Query('clienteId') clienteId?: string,
    @Query('asesorId') asesorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ventasService.findAll(
      clienteId ? +clienteId : undefined,
      asesorId ? +asesorId : undefined,
      page ? +page : 1,
      limit ? +limit : 10,
      req.user.id,
      req.user.role,
    );
  }

  @Get('cobros')
  obtenerVentasParaCobros(
    @Query('cliente') cliente?: string,
    @Query('lote') lote?: string,
    @Query('urbanizacion') urbanizacion?: string,
    @Query('encargado') encargado?: string,
  ) {
    return this.ventasService.obtenerVentasParaCobros({
      cliente,
      lote,
      urbanizacion,
      encargado,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(+id);
  }

  @Get(':id/cronograma')
  obtenerCronograma(@Param('id') id: string) {
    return this.ventasService.obtenerCronograma(+id);
  }
@Patch(':id')
update(
  @Param('id') id: string,
  @Body() updateVentaDto: UpdateVentaDto,
  @Request() req,
) {
  const usuarioId = req.user.id;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  return this.ventasService.update(
    +id,
    updateVentaDto,
    usuarioId,
    ip,
    userAgent,
  );
}

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const { cajaId } = req.body;
    if (!cajaId) {
      throw new BadRequestException(
        'Se requiere el ID de la caja para eliminar la venta',
      );
    }
    return this.ventasService.remove(+id, cajaId, usuarioId, ip, userAgent);
  }

  @Post('pagos/registrar')
  crearPagoPlan(@Body() registrarPagoDto: RegistrarPagoDto, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.crearPagoPlan(
      registrarPagoDto,
      usuarioId,
      ip,
      userAgent,
    );
  }

  @Get('pagos/:pagoId')
  obtenerPago(@Param('pagoId') pagoId: string) {
    return this.ventasService.obtenerPago(+pagoId);
  }

  @Get('planes-pago/:planPagoId/pagos')
  obtenerPagosPlan(@Param('planPagoId') planPagoId: string) {
    return this.ventasService.obtenerPagosPlan(+planPagoId);
  }

  @Patch('pagos/:pagoId')
  actualizarPagoPlan(
    @Param('pagoId') pagoId: string,
    @Body() updatePagoPlanDto: UpdatePagoPlanDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.actualizarPagoPlan(
      +pagoId,
      updatePagoPlanDto,
      usuarioId,
      ip,
      userAgent,
    );
  }

  @Delete('pagos/:pagoId')
  eliminarPagoPlan(@Param('pagoId') pagoId: string, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const { cajaId } = req.body;
    if (!cajaId) {
      throw new BadRequestException(
        'Se requiere el ID de la caja para eliminar el pago',
      );
    }
    return this.ventasService.eliminarPagoPlan(
      +pagoId,
      cajaId,
      usuarioId,
      ip,
      userAgent,
    );
  }

  // Actualiza cualquiera de los 3 bloques (inicial/principal/adicional)
  // del plan de pago. El service es responsable de no tocar cuotas que
  // ya estén PAGADA o PARCIAL — ver actualizarPlanPago en VentasService.
  @Patch('planes-pago/:planPagoId')
  actualizarPlanPago(
    @Param('planPagoId') planPagoId: string,
    @Body() updatePlanPagoDto: UpdatePlanPagoDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.actualizarPlanPago(
      +planPagoId,
      updatePlanPagoDto,
      usuarioId,
      ip,
      userAgent,
    );
  }

  @Get(':id/resumen-pago')
  obtenerResumenPlanPago(@Param('id') id: string) {
    return this.ventasService.obtenerResumenPlanPago(+id);
  }

  @Get('planes-pago/activos')
  obtenerPlanesPagoActivos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ventasService.obtenerPlanesPagoActivos(
      page ? +page : 1,
      limit ? +limit : 10,
    );
  }

  @Post('planes-pago/:id/verificar-morosidad')
  verificarMorosidadPlanPago(@Param('id') id: string) {
    return this.ventasService.verificarMorosidadPlanPago(+id);
  }

  @Get('clientes/mis-ventas')
  obtenerVentasCliente(@Request() req) {
    const clienteId = req.user.id;
    return this.ventasService.obtenerVentasPorCliente(clienteId);
  }

  @Get('cajas/activas')
  obtenerCajasActivas() {
    return this.ventasService.obtenerCajasActivas();
  }

  // Antes solo aceptaba { nuevoMontoInicial, cajaId }. Ahora recibe el
  // PlanInicialDto completo (montoInicial, fraccionado, modalidad,
  // cantidadPagos, fechaInicio), porque el Inicial ya puede tener su
  // propio cronograma de cuotas y no solo un monto suelto.
  @Patch('plan-pago/:ventaId/monto-inicial')
  actualizarMontoInicial(
    @Param('ventaId') ventaId: string,
    @Body() body: { inicial: PlanInicialDto; cajaId: number },
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.ventasService.actualizarMontoInicialPlanPago(
      +ventaId,
      body.inicial,
      body.cajaId,
      usuarioId,
      ip,
      userAgent,
    );
  }
}