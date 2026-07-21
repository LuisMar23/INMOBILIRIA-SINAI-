// src/propiedad/propiedad.controller.ts
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
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PropiedadService } from './propiedad.service';
import {
  CreatePropiedadDto,
  TipoPropiedad,
  EstadoPropiedad,
  EstadoInmueble,
} from './dto/create-propiedad.dto';
import { UpdatePropiedadDto } from './dto/update-propiedad.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('propiedades')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class PropiedadController {
  constructor(private readonly propiedadService: PropiedadService) {}

  @Get('publicas/todas')
  async findAllPublicas() {
    return this.propiedadService.findAllPublicas();
  }

  @Get('uuid/:uuid')
  async findOneUUIDPublic(@Param('uuid') uuid: string) {
    return this.propiedadService.findOneUUID(uuid);
  }

  @Get('tipo/:tipo')
  async getPropiedadesPorTipoPublic(@Param('tipo') tipo: TipoPropiedad) {
    return this.propiedadService.getPropiedadesPorTipo(tipo);
  }

  @Get('estado-propiedad/:estado')
  async getPropiedadesPorEstadoPublic(@Param('estado') estado: EstadoPropiedad) {
    return this.propiedadService.getPropiedadesPorEstado(estado);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createPropiedadDto: CreatePropiedadDto, @Request() req) {
    createPropiedadDto.usuarioId = req.user.id;
    return this.propiedadService.create(createPropiedadDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Request() req) {
    return this.propiedadService.findAll(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('para-cotizacion')
  getPropiedadesParaCotizacion() {
    return this.propiedadService.getPropiedadesParaCotizacion();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('estado-inmueble/:estado')
  getPropiedadesPorEstadoInmueble(@Param('estado') estado: EstadoInmueble) {
    return this.propiedadService.getPropiedadesPorEstadoInmueble(estado);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propiedadService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropiedadDto: UpdatePropiedadDto,
    @Request() req,
  ) {
    updatePropiedadDto.usuarioId = req.user.id;
    return this.propiedadService.update(id, updatePropiedadDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.propiedadService.remove(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/asignar-encargado')
  asignarEncargado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { encargadoId: number },
    @Request() req,
  ) {
    return this.propiedadService.asignarEncargado(
      id,
      body.encargadoId,
      req.user.id,
    );
  }
}