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
import { CierreService } from './cierre.service';
import { CreateCierreDto } from './dto/create-cierre.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('cierre')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class CierreController {
  constructor(private readonly cierreService: CierreService) {}

  @Post()
  create(@Body() dto: CreateCierreDto, @Request() req) {
    const usuarioId = req.user.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.cierreService.create({ ...dto, usuarioId, ip, userAgent });
  }

  @Get('caja/:cajaId')
  findByCaja(@Param('cajaId') cajaId: string) {
    return this.cierreService.findByCaja(+cajaId);
  }

  @Get('caja/:cajaId/ultimo')
  getUltimoCierre(@Param('cajaId') cajaId: string) {
    return this.cierreService.getUltimoCierre(+cajaId);
  }
}
