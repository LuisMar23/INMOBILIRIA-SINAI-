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
  Put,
} from '@nestjs/common';
import { PromocionService } from './promocion.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';

@Controller('promociones')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class PromocionController {
  constructor(private readonly promocionService: PromocionService) {}

  @Post()
  create(@Body() createPromocionDto: CreatePromocionDto) {
    return this.promocionService.create(createPromocionDto);
  }

  @Get()
  findAll() {
    return this.promocionService.findAll();
  }

  @Get('publicas/todas')
  async findAllPublicas() {
    return this.promocionService.findAllPublicas();
  }

  @Get('activas')
  getPromocionesActivas() {
    return this.promocionService.getPromocionesActivas();
  }

  @Get('lotes-disponibles')
  getLotesDisponibles() {
    return this.promocionService.getLotesDisponibles();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promocionService.findOne(+id);
  }

  @Get(':id/lotes-afectados')
  getLotesConPromocionActiva(@Param('id') id: string) {
    return this.promocionService.getLotesConPromocionActiva(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePromocionDto: UpdatePromocionDto,
  ) {
    return this.promocionService.update(+id, updatePromocionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promocionService.remove(+id);
  }

  @Post(':id/asignar-lotes')
  asignarLotes(@Param('id') id: string, @Body() body: { lotesIds: number[] }) {
    return this.promocionService.asignarLotesAPromocion(+id, body.lotesIds);
  }

  @Post(':id/remover-lotes')
  removerLotes(@Param('id') id: string, @Body() body: { lotesIds: number[] }) {
    return this.promocionService.removerLotesDePromocion(+id, body.lotesIds);
  }

  @Put(':id/asignar-urbanizacion/:urbanizacionId')
  asignarUrbanizacion(
    @Param('id') id: string,
    @Param('urbanizacionId') urbanizacionId: string,
  ) {
    return this.promocionService.asignarUrbanizacionAPromocion(
      +id,
      +urbanizacionId,
    );
  }

  @Post(':id/asignar-todos-lotes')
  asignarTodosLotes(@Param('id') id: string) {
    return this.promocionService.asignarTodosLotesAPromocion(+id);
  }

  @Post('verificar-expiradas')
  verificarExpiradas() {
    return this.promocionService.verificarPromocionesExpiradas();
  }
}