import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CajaService } from './caja.service';
import { CreateCajaDto, AbrirCajaDto } from './dto/create-caja.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('caja')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post()
  create(@Body() createCajaDto: CreateCajaDto) {
    return this.cajaService.create(createCajaDto);
  }

  @Get()
  findAll() {
    return this.cajaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cajaService.findOne(+id);
  }

  @Post(':id/abrir')
  abrir(
    @Param('id') id: string,
    @Body() abrirCajaDto: AbrirCajaDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.cajaService.abrir(
      +id,
      usuarioId,
      abrirCajaDto.montoInicial,
      ip,
      userAgent,
    );
  }

  @Post(':id/cerrar')
  cerrar(@Param('id') id: string, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.cajaService.cerrar(+id, usuarioId, ip, userAgent);
  }
}
