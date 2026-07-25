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
import { UrbanizacionService } from './urbanizacion.service';
import { CreateUrbanizacionDto } from './dto/create-urbanizacion.dto';
import { UpdateUrbanizacionDto } from './dto/update-urbanizacion.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('urbanizaciones')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard('jwt'))
export class UrbanizacionController {
  constructor(private readonly urbanizacionService: UrbanizacionService) {}

  @Post()
  create(@Body() createUrbanizacionDto: CreateUrbanizacionDto) {
    return this.urbanizacionService.create(createUrbanizacionDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? +page : 1;
    const limitNum = limit ? +limit : 10;

    return this.urbanizacionService.findAll(
      pageNum,
      limitNum,
      req.user.id,
      req.user.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.urbanizacionService.findOne(+id);
  }

  @Get('uuid/:uuid')
  findOneUUID(@Param('uuid') id: string) {
    console.log(id);
    return this.urbanizacionService.findOneUUID(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUrbanizacionDto: UpdateUrbanizacionDto,
  ) {
    return this.urbanizacionService.update(+id, updateUrbanizacionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.urbanizacionService.remove(+id);
  }
}

// NUEVO CONTROLADOR PÚBLICO (sin autenticación)
@Controller('public/urbanizaciones')
export class PublicUrbanizacionController {
  constructor(private readonly urbanizacionService: UrbanizacionService) {}

  @Get()
  findAllPublic() {
    return this.urbanizacionService.findAllPublic();
  }

  @Get('uuid/:uuid')
  findOneUUIDPublic(@Param('uuid') uuid: string) {
    return this.urbanizacionService.findOneUUIDPublic(uuid);
  }
}