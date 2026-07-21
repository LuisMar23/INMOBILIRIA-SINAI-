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
} from '@nestjs/common';
import { ReservasService } from './reserva.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('reservas')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  create(@Body() createReservaDto: CreateReservaDto, @Request() req) {
    const asesorId = req.user.id;
    return this.reservasService.create(createReservaDto, asesorId);
  }

  @Get()
  findAll(
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: string,
  ) {
    return this.reservasService.findAll(
      clienteId ? +clienteId : undefined,
      estado,
    );
  }

  @Get('lotes/disponibles')
  getLotesDisponibles(@Request() req) {
    const usuarioId = req.user.id;
    const usuarioRole = req.user.role;
    return this.reservasService.getLotesDisponiblesParaReserva(usuarioId, usuarioRole);
  }

  @Get('cliente/:clienteId')
  getReservasPorCliente(@Param('clienteId') clienteId: string) {
    return this.reservasService.getReservasPorCliente(+clienteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservasService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReservaDto: UpdateReservaDto,
    @Request() req,
  ) {
    const usuarioId = req.user.id;
    return this.reservasService.update(+id, updateReservaDto, usuarioId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const usuarioId = req.user.id;
    return this.reservasService.remove(+id, usuarioId);
  }
}