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
import { AuthGuard } from '@nestjs/passport';
import { ManzanoService } from './manzano.service';
import { CreateManzanoDto } from './dto/create-manzano.dto';
import { UpdateManzanoDto } from './dto/update-manzano.dto';

@Controller('manzanos')
@UseGuards(AuthGuard('jwt'))
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ManzanoController {
  constructor(private readonly manzanoService: ManzanoService) {}

  @Post()
  create(@Body() createManzanoDto: CreateManzanoDto, @Request() req) {
    createManzanoDto.usuarioId = req.user.id;
    return this.manzanoService.create(createManzanoDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.manzanoService.findAll(req.user.id, req.user.role);
  }

  @Get('publicos')
  findAllPublic() {
    return this.manzanoService.findAllPublic();
  }

  @Get('por-urbanizacion/:urbanizacionId')
  findByUrbanizacion(@Param('urbanizacionId') urbanizacionId: string) {
    return this.manzanoService.findByUrbanizacion(+urbanizacionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.manzanoService.findOne(+id);
  }

  @Get('uuid/:uuid')
  findOneByUuid(@Param('uuid') uuid: string) {
    return this.manzanoService.findOneByUuid(uuid);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateManzanoDto: UpdateManzanoDto,
    @Request() req,
  ) {
    updateManzanoDto.usuarioId = req.user.id;
    return this.manzanoService.update(+id, updateManzanoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.manzanoService.remove(+id, req.user.id);
  }
}