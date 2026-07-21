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

import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { SedeService } from './sedes.service';

@Controller('sedes')
@UseGuards(AuthGuard('jwt'))
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class SedeController {
  constructor(private readonly sedeService: SedeService) {}

  @Post()
  create(@Body() createSedeDto: CreateSedeDto, @Request() req) {
    createSedeDto.usuarioId = req.user.id;
    return this.sedeService.create(createSedeDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.sedeService.findAll(req.user.id, req.user.role);
  }

  @Get('publicos')
  findAllPublic() {
    return this.sedeService.findAllPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sedeService.findOne(+id);
  }

  @Get('uuid/:uuid')
  findOneByUuid(@Param('uuid') uuid: string) {
    return this.sedeService.findOneByUuid(uuid);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSedeDto: UpdateSedeDto,
    @Request() req,
  ) {
    updateSedeDto.usuarioId = req.user.id;
    return this.sedeService.update(+id, updateSedeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.sedeService.remove(+id, req.user.id);
  }
}
